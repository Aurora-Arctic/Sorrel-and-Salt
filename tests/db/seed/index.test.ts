import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { MINIMAL_USER_ID } from '@/db/seed/minimal';
import { resolveScenario, seed } from '@/db/seed/index';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { seedSources } from '@/db/seed/sources';
import { seedCompendium } from '@/db/seed/compendium';
import { seedDocuments } from '@/db/seed/documents';
import { seedHelp } from '@/db/seed/help';
import type { SeedDatabase } from '@/db/seed/types';
import { fixtureFiles } from './compendium/files-fixture';
import type { SeedEntry, UserRow } from './types';
import { useTestDatabase } from '../../support/db/database';

// The handle is this file's own; that the seed writes through it rather than a client of its own is enforced by lint (claude-docs/db/seed-module.md, "The seed module").

const PROBE = 'seed_probe_acting_user';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let db: ReturnType<typeof drizzle>;
let tables: string[];
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

  // Records, per inserted row in order, its id and what `app.current_user_id` held inside the inserting transaction; it is transaction-local and gone by the time a test could read it.
  await sql`create table ${sql(PROBE)} (seq bigserial, table_name text not null, row_id text, acting_user text)`;
  await sql.unsafe(`
    create function ${PROBE}() returns trigger language plpgsql as $$
    begin
      insert into ${PROBE} (table_name, row_id, acting_user)
      values (tg_table_name, to_jsonb(new) ->> 'id', current_setting('app.current_user_id', true));
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

afterAll(async () => {
  await sql.unsafe(`drop function if exists ${PROBE}() cascade`);
  await sql`drop table if exists ${sql(PROBE)}`;
});

describe('seed(db, { scenario: "minimal" })', () => {
  beforeAll(async () => {
    await truncateAllTables(sql);
    // Precondition: the truncated clone really starts empty, so the rows read are this seed's.
    expect(await countOf('users')).toBe(0);
    await seed(db, { scenario: 'minimal' });
  });

  it('produces the system user, the signed-out support sender, the job actor and one user, and no admin', async () => {
    const users = await allUsers();
    expect(users.map((u) => u.id)).toEqual([
      BOOTSTRAP_USER_ID,
      MINIMAL_USER_ID,
      SIGNED_OUT_SENDER_ID,
      SYSTEM_ACTOR_ID,
    ]);
    expect(users.map((u) => u.role)).toEqual(['user', 'user', 'user', 'user']);
    expect(users.every((u) => u.deleted_at === null)).toBe(true);
  });
});

describe('resolveScenario', () => {
  // A typo must not quietly seed `minimal`.
  it('refuses an unknown name rather than falling back', () => {
    expect(() => resolveScenario('Standard')).toThrow();
    expect(() => resolveScenario('everything')).toThrow();
  });
});

// Every entry point opens with `beginSeedTransaction`, which inserts the bootstrap row when it is missing.
// That row is no admin: it has no OAuth account and nobody can sign in as it, so as a keeper it would only be a revocable row on /keepers/users.
// Each entry names the tables it fills from empty: the six `migrate.yml` runs on staging and production; the dev-only scenarios are a developer's to see working.
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
      // The other three sweeps read the two-entry fixture, since what they prove does not grow with the files and the real list costs seconds a run.
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
    {
      // The site's four documents, read from the real files under `documents/`: there are few enough for every sweep.
      name: 'the documents seed',
      seed: seedDocuments,
      tables: ['documents', 'document_versions'],
    },
    {
      // The help articles and the glossary, the real list: a few dozen rows, few enough for every sweep.
      name: 'the help seed',
      seed: seedHelp,
      tables: ['help_articles'],
    },
  ] satisfies Omit<SeedEntry, 'run'>[]
).map((entry: Omit<SeedEntry, 'run'>) => ({
  ...entry,
  run: async (db: SeedDatabase) => {
    await entry.prepare?.(db);
    await entry.seed(db);
  },
}));

// One truncate per seed; its four steps run in order on what the step before left: a dry run, the real run and fill, a second run, then a second run over a tombstone.
describe.each(SEED_ENTRIES)('the shape every seed shares: $name', (entry) => {
  const { prepare, seed: seedOf, fillSeed, run, tables: own } = entry;
  let beforeDryRun: Record<string, string[]>;

  beforeAll(async () => {
    await truncateAllTables(sql);
  });

  it('writes nothing on a dry run, anywhere', async () => {
    // Precondition: the truncated clone really starts empty, so the rows the next step reads are its own.
    for (const table of ['users', ...own]) expect(await countOf(table), table).toBe(0);
    await prepare?.(db);
    beforeDryRun = await snapshot();
    const inserts = await countOf(PROBE);

    await seedOf(db, { dryRun: true });

    expect(await snapshot()).toEqual(beforeDryRun);
    expect(await countOf(PROBE), 'no insert outlived the dry run').toBe(inserts);
  });

  it('fills its tables from empty as the bootstrap user: a plain user, the stamp on every row, the acting user of every insert', async () => {
    await seedOf(db);
    // Precondition of the dry run: the same run without --dry-run writes, so an unchanged
    // database was the dry run's doing and not an empty seed's.
    expect(await snapshot()).not.toEqual(beforeDryRun);
    await fillSeed?.(db);

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
  });

  // Idempotent rather than truncate-first: every table byte for byte, and no
  // trip on a unique index.
  it('is idempotent: a second run adds nothing and moves nothing, anywhere', async () => {
    const before = await snapshot();
    const inserts = await countOf(PROBE);
    // Precondition: the first run wrote rows for the second to leave alone.
    expect(inserts).toBeGreaterThan(0);

    await expect(run(db)).resolves.toBeUndefined();

    expect(await snapshot()).toEqual(before);
    expect(await countOf(PROBE), 'no second insert reached any table').toBe(inserts);
  });

  // Keyed on identity, ignoring `deleted_at`: the partial unique indexes stop
  // only a second live row, and would let the tombstoned one's twin through.
  it('does not resurrect a row a keeper has since deleted, in any of its tables', async () => {
    const deletable = own.filter((table) => tombstoned.has(table));
    // Precondition: there is a tombstone to leave, so an empty loop proves nothing.
    expect(deletable.length).toBeGreaterThan(0);
    // A seed revives a row its own identity deleted (the help seed retires and revives its own rows), so the
    // deleter is a person, a different user from the seed's own.
    const keeper = '00000000-0000-4000-8000-0000000000a1';
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${keeper}, 'Testwort Keeper', 'keeper@example.test', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})`;
    for (const table of deletable) {
      // The victim is the first row the table received, which `run` writes again; a row only the fill wrote
      // would never be offered back. The bootstrap user is every seed's own identity, written back by design.
      const [victim] = await sql<{ row_id: string }[]>`
        select row_id from ${sql(PROBE)}
        where table_name = ${table} and row_id not in (${BOOTSTRAP_USER_ID}, ${keeper})
        order by seq limit 1
      `;
      const deleted = await sql.unsafe(
        `update "${table}" set deleted_at = now(), deleted_by = $1 where id::text = $2`,
        [keeper, victim.row_id],
      );
      expect(deleted.count, table).toBe(1);
    }
    const before = new Map<string, number>();
    for (const table of deletable) before.set(table, await countOf(table));

    await run(db);

    for (const table of deletable) {
      expect(await countOf(table), `${table} gained a row`).toBe(before.get(table));
      expect(await countOf(table, 'where deleted_at is not null'), table).toBe(1);
    }
  });
});
