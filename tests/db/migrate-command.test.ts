import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import {
  BASE_TEMPLATE,
  cloneDatabase,
  databaseUrl,
  dropDatabase,
} from '../support/seeded-database';
import {
  journalEntries,
  migrationHash,
  migrationsWith,
  runDrizzleKitMigrate,
  runMigrate,
  type JournalEntry,
} from '../support/db/migrate-command';

// Each run starts from the extensions-only base rather than this worker's clone, which the template build has
// already migrated to the head: a fresh database is the only one on which a run has migrations to apply.

const RUN_TIMEOUT_MS = 180_000;
const REFUSED_TAG = '9999_refused_probe';
// `users` exists only once the real migrations have applied, so this refusal also proves the run reached them. Not a
// duplicate table: its code, 42P07, is also on the NOTICE the migrator's own CREATE TABLE IF NOT EXISTS prints.
const REFUSED = { tag: REFUSED_TAG, sql: 'ALTER TABLE "users" ADD COLUMN "id" text;' };
// Two files holding one statement, so a lookup by statement alone finds the applied file first. Neither tag is part
// of the other, so the output can be checked for each.
const DUPLICATE_STATEMENT = 'ALTER TABLE "users" ADD COLUMN "probe_dup" text;';
const DUPLICATE_APPLIED = { tag: '9998_duplicate_applied_probe', sql: DUPLICATE_STATEMENT };
const DUPLICATE_REFUSED = { tag: '9999_duplicate_refused_probe', sql: DUPLICATE_STATEMENT };
const AFTER_KIT = {
  tag: '9999_after_kit_probe',
  sql: 'CREATE TABLE "migrate_command_probe" ("id" text);',
};

const slot = process.env.VITEST_POOL_ID;

type Database = { name: string; url: string; sql: postgres.Sql };

async function freshDatabase(name: string): Promise<Database> {
  await cloneDatabase(name, BASE_TEMPLATE);
  const url = databaseUrl(name);
  return { name, url, sql: postgres(url, { onnotice: () => {} }) };
}

async function closeDatabase(database: Database | undefined): Promise<void> {
  if (!database) return;
  await database.sql.end();
  await dropDatabase(database.name);
}

async function recorded(sql: postgres.Sql): Promise<{ hash: string; created_at: string }[]> {
  return sql`select hash, created_at::text from drizzle.__drizzle_migrations order by created_at`;
}

async function tableExists(sql: postgres.Sql, table: string): Promise<boolean> {
  const [row] = await sql<{ found: boolean }[]>`select to_regclass(${table}) is not null as found`;
  return row.found;
}

let real: JournalEntry[];
const folders: string[] = [];

async function folderWith(...probes: { tag: string; sql: string }[]): Promise<string> {
  const folder = await migrationsWith(probes);
  folders.push(folder);
  return folder;
}

beforeAll(async () => {
  real = await journalEntries();
});

afterAll(async () => {
  await Promise.all(folders.map((folder) => rm(folder, { recursive: true, force: true })));
});

describe('npm run db:migrate on a fresh database', () => {
  let database: Database;

  beforeAll(async () => {
    database = await freshDatabase(`sorrel_migrate_${slot}`);
  });

  afterAll(async () => {
    await closeDatabase(database);
  });

  it(
    'records each migration in drizzle.__drizzle_migrations as drizzle-kit does, and a rerun applies nothing',
    async () => {
      const folder = await folderWith();
      // Precondition: the base holds no schema, so every migration below is one this run applied.
      expect(await tableExists(database.sql, 'users')).toBe(false);

      const first = await runMigrate(database.url, folder);

      expect(first.code, first.output).toBe(0);
      expect(await tableExists(database.sql, 'users')).toBe(true);
      // drizzle-kit reads `created_at` as the journal's `when` and skips every migration at or before the newest,
      // and records the sha256 of the file: the same two values keep a database either command migrated readable by both.
      expect(await recorded(database.sql)).toEqual(
        await Promise.all(
          real.map(async (entry) => ({
            hash: await migrationHash(folder, entry.tag),
            created_at: String(entry.when),
          })),
        ),
      );

      const rerun = await runMigrate(database.url, folder);

      expect(rerun.code, rerun.output).toBe(0);
      expect(await recorded(database.sql)).toHaveLength(real.length);
    },
    RUN_TIMEOUT_MS,
  );

  it(
    "names the refused migration's file and Postgres's error code and message",
    async () => {
      // The real migrations apply first in a run of their own: the migrator applies every pending migration in one
      // transaction, so a run that also held the refused one would roll them back with it.
      const applied = await runMigrate(database.url, await folderWith());
      expect(applied.code, applied.output).toBe(0);
      expect(await recorded(database.sql)).toHaveLength(real.length);
      expect(await tableExists(database.sql, 'users')).toBe(true);

      const refused = await runMigrate(database.url, await folderWith(REFUSED));

      expect(refused.code).not.toBe(0);
      expect(refused.output).toContain(`${REFUSED_TAG}.sql`);
      expect(refused.output).toContain('42701');
      expect(refused.output).toContain('column "id" of relation "users" already exists');
      // Nothing of the refused migration is recorded, so the next attempt tries it again.
      expect(await recorded(database.sql)).toHaveLength(real.length);
    },
    RUN_TIMEOUT_MS,
  );

  it(
    'names the refused migration, not an applied one holding the same statement',
    async () => {
      const applied = await runMigrate(database.url, await folderWith(DUPLICATE_APPLIED));
      // Preconditions: the first probe applied, so the second's identical statement is refused with 42701.
      expect(applied.code, applied.output).toBe(0);
      expect(await recorded(database.sql)).toHaveLength(real.length + 1);
      const [column] = await database.sql`
        select 1 from information_schema.columns
        where table_name = 'users' and column_name = 'probe_dup'`;
      expect(column).toBeDefined();

      const refused = await runMigrate(
        database.url,
        await folderWith(DUPLICATE_APPLIED, DUPLICATE_REFUSED),
      );

      expect(refused.code).not.toBe(0);
      expect(refused.output).toContain('42701');
      expect(refused.output).toContain(`${DUPLICATE_REFUSED.tag}.sql`);
      expect(refused.output).not.toContain(DUPLICATE_APPLIED.tag);
      expect(await recorded(database.sql)).toHaveLength(real.length + 1);
    },
    RUN_TIMEOUT_MS,
  );
});

describe('a database drizzle-kit migrated', () => {
  let database: Database;

  beforeAll(async () => {
    database = await freshDatabase(`sorrel_migrate_kit_${slot}`);
  });

  afterAll(async () => {
    await closeDatabase(database);
  });

  it(
    'is taken up by npm run db:migrate, which applies only the migration it lacks',
    async () => {
      const kit = await runDrizzleKitMigrate(database.url);
      // Precondition: drizzle-kit recorded every real migration, so anything applied below is the probe alone.
      expect(kit.code, kit.output).toBe(0);
      expect(await recorded(database.sql)).toHaveLength(real.length);

      const same = await runMigrate(database.url, await folderWith());

      expect(same.code, same.output).toBe(0);
      expect(await recorded(database.sql)).toHaveLength(real.length);

      const ahead = await runMigrate(database.url, await folderWith(AFTER_KIT));

      expect(ahead.code, ahead.output).toBe(0);
      expect(await tableExists(database.sql, 'migrate_command_probe')).toBe(true);
      expect(await recorded(database.sql)).toHaveLength(real.length + 1);
    },
    RUN_TIMEOUT_MS,
  );
});
