import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { MINIMAL_USER_ID } from '@/db/seed/minimal';
import { resolveScenario, seed } from '@/db/seed/index';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { seedSources } from '@/db/seed/sources';
import { seedCompendium } from '@/db/seed/compendium';
import { loadCompendium } from '@/db/seed/compendium/load';
import type { SeedDatabase } from '@/db/seed/types';
import { fixtureFiles } from './compendium/files-fixture';
import type { SeedEntry, UserRow } from './types';

// The shape every production seed shares, asserted here once over all of them
// (MB.183) and in no per-seed file: the bootstrap user inserted and published as the acting user,
// every row stamped as it, a second run a no-op, and nothing an admin deleted
// brought back. The handle is this file's own; that the seed writes through
// it rather than a client of its own is enforced by lint, not here —
// claude-docs/db/seed-module.md, "The seed module".

const PROBE = 'seed_probe_acting_user';

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;
/** Every table under test, the probe excluded. */
let tables: string[];
/** The tables that carry a tombstone; a hard-deleted join table has none to leave. */
let tombstoned: Set<string>;

async function allUsers(): Promise<UserRow[]> {
  return sql<UserRow[]>`
    select id, email, role, can_create_workspace, created_by, updated_by, deleted_at
    from users order by role, id
  `;
}

async function countOf(table: string, where = ''): Promise<number> {
  const [{ count }] = await sql.unsafe<{ count: string }[]>(
    `select count(*) from "${table}" ${where}`,
  );
  return Number(count);
}

/** Every row of every table, as text, so a second run's writes show as a diff. */
async function snapshot(): Promise<Record<string, string[]>> {
  const rows: Record<string, string[]> = {};
  for (const table of tables) {
    const found = await sql.unsafe<{ row: string }[]>(
      `select to_jsonb(t)::text as row from "${table}" t`,
    );
    rows[table] = found.map((r) => r.row).sort();
  }
  return rows;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);

  tables = (
    await sql<{ tablename: string }[]>`
      select tablename from pg_tables where schemaname = 'public' order by tablename
    `
  ).map((row) => row.tablename);
  tombstoned = new Set(
    (
      await sql<{ table_name: string }[]>`
        select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'deleted_at'
      `
    ).map((row) => row.table_name),
  );

  // Records, per inserted row, what `app.current_user_id` held inside the
  // inserting transaction; it is transaction-local and gone by the time a test
  // could read it. One function, a trigger on every table, so the one probe
  // watches every seed's own rows and not only the bootstrap user's.
  await sql`create table ${sql(PROBE)} (table_name text not null, acting_user text)`;
  await sql.unsafe(`
    create function ${PROBE}() returns trigger language plpgsql as $$
    begin
      insert into ${PROBE} (table_name, acting_user)
      values (tg_table_name, current_setting('app.current_user_id', true));
      return new;
    end
    $$
  `);
  for (const table of tables) {
    await sql.unsafe(
      `create trigger ${PROBE} after insert on "${table}" for each row execute function ${PROBE}()`,
    );
  }
});

// Only this file's own objects come down.
afterAll(async () => {
  await sql.unsafe(`drop function if exists ${PROBE}() cascade`);
  await sql`drop table if exists ${sql(PROBE)}`;
  await sql.end();
});

describe('seed(db, { scenario: "minimal" })', () => {
  // One run for the reads below; the shape every seed shares is asserted further down.
  beforeAll(async () => {
    await truncateAllTables(sql);
    // Precondition: the truncated clone really starts empty, so the rows read are this seed's.
    expect(await countOf('users')).toBe(0);
    await seed(db, { scenario: 'minimal' });
  });

  // MB.58: the system user is a creator, not an admin, so a bare install has none.
  it('produces exactly one system user and one user, and no admin', async () => {
    const users = await allUsers();
    expect(users.map((u) => u.id)).toEqual([BOOTSTRAP_USER_ID, MINIMAL_USER_ID]);
    expect(users.map((u) => u.role)).toEqual(['user', 'user']);
    expect(users.every((u) => u.deleted_at === null)).toBe(true);
  });
});

// The CLI and the Docker hook both read `SEED_SCENARIO`. The parse lives
// beside the union so the two cannot disagree, and so it is testable at all
// (scripts/ runs its work at import time).
describe('resolveScenario', () => {
  // A typo must not quietly seed `minimal`.
  it('refuses an unknown name rather than falling back', () => {
    expect(() => resolveScenario('Standard')).toThrow();
    expect(() => resolveScenario('everything')).toThrow();
  });
});

// Every entry point opens with `beginSeedTransaction`, so each inserts the
// bootstrap row when it is missing — the reference-data seeds alone, on staging
// and production. From wherever, it is no admin (MB.58): it has no OAuth
// account and nobody can sign in as it, so as an admin it would only be a
// revocable row on /admin/users.
//
// Each entry names the tables it is the seed of: the ones it fills from empty.
// The six that `migrate.yml` runs on staging and production; the dev-only
// scenarios are a developer's to see working.
const SEED_ENTRIES: SeedEntry[] = (
  [
    {
      name: 'the category seed',
      seed: seedCategories,
      tables: ['category_groups', 'categories'],
    },
    {
      name: 'the form seed',
      seed: seedForms,
      tables: ['ingredient_form_groups', 'ingredient_forms'],
    },
    {
      name: 'the astrology seed',
      seed: seedAstrology,
      tables: ['celestial_bodies', 'zodiac_signs'],
    },
    {
      name: 'the deity seed',
      seed: seedDeities,
      tables: ['deity_traditions', 'deities', 'deity_other_names'],
    },
    {
      // A source links rows the two vocabularies wrote, so alone it has nothing to link.
      name: 'the sources seed, after the vocabularies it links',
      prepare: async (db) => {
        await seedDeities(db);
        await seedAstrology(db);
      },
      seed: seedSources,
      tables: ['references', 'reference_links'],
    },
    {
      // On the production list, after everything it picks from and the sources
      // it may share a work with. The fill sweep reads the real files under
      // `compendium/` (M14.10), so every table it names is proved filled; the
      // other three sweeps read the two-entry fixture, since what they prove
      // does not grow with the files and the real list costs seconds a run (M14.27).
      name: 'the compendium seed, after the vocabularies and sources',
      prepare: async (db) => {
        await seedCategories(db);
        await seedForms(db);
        await seedAstrology(db);
        await seedDeities(db);
        await seedSources(db);
      },
      seed: async (db, options) => {
        await seedCompendium(db, fixtureFiles(), options);
      },
      fillSeed: async (db) => {
        await seedCompendium(db);
      },
      tables: [
        'ingredients',
        'ingredient_variants',
        'ingredient_folk_names',
        'ingredient_deities',
        'ingredient_categories',
        'ingredient_substitutes',
        'references',
        'reference_links',
      ],
    },
  ] satisfies Omit<SeedEntry, 'run'>[]
).map((entry: Omit<SeedEntry, 'run'>) => ({
  ...entry,
  run: async (db: SeedDatabase) => {
    await entry.prepare?.(db);
    await entry.seed(db);
  },
}));

describe('the shape every seed shares', () => {
  beforeEach(async () => {
    await truncateAllTables(sql);
  });

  // Precondition of the compendium entry: an empty list would pass every sweep below by writing nothing.
  it('runs the compendium seed over files that hold approved entries', () => {
    const { files } = loadCompendium();
    expect(files.filter((file) => file.status === 'approved').length).toBeGreaterThan(0);
  });

  // One run, read three ways: the bootstrap row it inserted, the stamps on
  // every row of its own tables, and the acting user the probe saw on every
  // insert — each with the precondition that the rows are this run's.
  it.each(SEED_ENTRIES)(
    '$name fills its tables from empty as the bootstrap user: a plain user, the stamp on every row, the acting user of every insert',
    async ({ prepare, seed: seedOf, fillSeed, tables: own }) => {
      // Precondition: the truncated clone really starts empty, so these rows are this run's.
      for (const table of ['users', ...own]) expect(await countOf(table), table).toBe(0);

      await prepare?.(db);
      await (fillSeed ?? seedOf)(db);

      const [system] = (await allUsers()).filter((u) => u.id === BOOTSTRAP_USER_ID);
      expect(system).toMatchObject({ email: 'admin@seed.sorrelandsalt.com', role: 'user' });

      for (const table of own) {
        const rows = await sql.unsafe<{ row: Record<string, unknown> }[]>(
          `select to_jsonb(t) as row from "${table}" t`,
        );
        expect(rows.length, table).toBeGreaterThan(0);
        for (const { row } of rows) {
          expect(row.created_by, table).toBe(BOOTSTRAP_USER_ID);
          expect(row.updated_by, table).toBe(BOOTSTRAP_USER_ID);
          expect(row.deleted_at ?? null, table).toBeNull();
        }
      }

      const inserts = await sql<{ table_name: string; acting_user: string | null }[]>`
        select table_name, acting_user from ${sql(PROBE)}
      `;
      // Precondition: the probe saw this seed's own rows, not only the bootstrap user's.
      const seen = new Set(inserts.map((row) => row.table_name));
      for (const table of ['users', ...own]) expect(seen.has(table), table).toBe(true);
      expect(inserts.filter((row) => row.acting_user !== BOOTSTRAP_USER_ID)).toEqual([]);
    },
  );

  // Idempotent rather than truncate-first: every table byte for byte, and no
  // trip on a unique index.
  it.each(SEED_ENTRIES)(
    '$name is idempotent: a second run adds nothing and moves nothing, anywhere',
    async ({ run }) => {
      await run(db);
      const before = await snapshot();
      const inserts = await countOf(PROBE);
      // Precondition: the first run wrote rows for the second to leave alone.
      expect(inserts).toBeGreaterThan(0);

      await expect(run(db)).resolves.toBeUndefined();

      expect(await snapshot()).toEqual(before);
      expect(await countOf(PROBE), 'no second insert reached any table').toBe(inserts);
    },
  );

  // Keyed on identity, ignoring `deleted_at`: the partial unique indexes stop
  // only a second live row, and would let the tombstoned one's twin through.
  it.each(SEED_ENTRIES)(
    '$name does not resurrect a row an admin has since deleted, in any of its tables',
    async ({ run, tables: own }) => {
      await run(db);

      const deletable = own.filter((table) => tombstoned.has(table));
      // Precondition: there is a tombstone to leave, so an empty loop proves nothing.
      expect(deletable.length).toBeGreaterThan(0);
      for (const table of deletable) {
        // The bootstrap user is every seed's own identity, written back by
        // design; the victim is any other row.
        const victim = table === 'users' ? `where id <> '${BOOTSTRAP_USER_ID}'` : '';
        const deleted = await sql.unsafe(`
          update "${table}" set deleted_at = now(), deleted_by = '${BOOTSTRAP_USER_ID}'
          where ctid = (select ctid from "${table}" ${victim} limit 1)
        `);
        expect(deleted.count, table).toBe(1);
      }
      const before = new Map<string, number>();
      for (const table of deletable) before.set(table, await countOf(table));

      await run(db);

      for (const table of deletable) {
        expect(await countOf(table), `${table} gained a row`).toBe(before.get(table));
        expect(await countOf(table, 'where deleted_at is not null'), table).toBe(1);
      }
    },
  );
  // M14.26: the hand-started seed workflow runs each seed with --dry-run
  // first. A dry run does all its reads and writes, then rolls its
  // transaction back, so every table reads as it did before.
  it.each(SEED_ENTRIES)(
    '$name writes nothing on a dry run, anywhere',
    async ({ prepare, seed: seedOf }) => {
      await prepare?.(db);
      const before = await snapshot();
      const inserts = await countOf(PROBE);

      await seedOf(db, { dryRun: true });

      expect(await snapshot()).toEqual(before);
      expect(await countOf(PROBE), 'no insert outlived the dry run').toBe(inserts);

      // Precondition: the same run without --dry-run writes, so an unchanged
      // database is the dry run's doing and not an empty seed's.
      await seedOf(db);
      expect(await snapshot()).not.toEqual(before);
    },
  );
});
