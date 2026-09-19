import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { MIGRATIONS_DIR } from '../support/paths';
import { ingredientFolkNames } from '@/db/schema/ingredient-folk-names';
import { ingredients } from '@/db/schema/ingredients';

// DESIGN.md §9's one multicolumn index, beside `ingredient_folk_names`' own
// (M4.4a). A multicolumn `gin_trgm_ops` index serves a query on either column
// alone, which is why the two names need one index rather than two — the
// planner assertions below are what turn that claim into a fact.
const TRIGRAM_INDEX = 'ingredients_trgm';
const FOLK_NAMES_TRIGRAM_INDEX = 'ingredient_folk_names_trgm';

// M4.1a's three, named only so the declaration test can say the trigram index
// joined them rather than replaced one.
const UNIQUE_INDEXES = [
  'ingredients_compendium_identity_unique',
  'ingredients_workspace_identity_unique',
  'ingredients_workspace_label_unique',
];

describe('ingredients trigram index declaration', () => {
  const { indexes } = getTableConfig(ingredients);
  const byName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));

  it('declares the trigram index beside M4.1a’s three unique ones', () => {
    expect(Object.keys(byName).sort()).toEqual([...UNIQUE_INDEXES, TRIGRAM_INDEX].sort());
  });

  it('builds it as a gin index over both names', () => {
    expect(byName[TRIGRAM_INDEX].config.method).toBe('gin');
    expect(byName[TRIGRAM_INDEX].config.columns).toHaveLength(2);
  });

  // Uniqueness is the other three indexes' job, and a partial predicate would
  // be actively wrong here: `%` answers "what is this called", and a soft-
  // deleted row a finder already filters out is not worth narrowing the
  // planner's choice over. Same reasoning as the folk-names index (M4.4a).
  it('makes it neither unique nor partial', () => {
    expect(byName[TRIGRAM_INDEX].config.unique).toBe(false);
    expect(byName[TRIGRAM_INDEX].config.where).toBeUndefined();
  });
});

// The behaviour half, following M4.1a/M4.4a's idiom: apply the shipped
// migrations into this worker's disposable clone rather than hand-copying their
// DDL, so what is asserted below is the SQL production runs. `users` and
// `workspaces` are stubbed to the one column the foreign keys point at —
// applying their own migrations here would leave a __drizzle_migrations table
// behind for the next test file in this worker to trip over.

function migrationStatementsContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const TRIGRAM_MIGRATION = `CREATE INDEX IF NOT EXISTS "${TRIGRAM_INDEX}"`;

const AUTHOR = '11111111-1111-1111-1111-111111111111';

let sql: ReturnType<typeof postgres>;

async function addIngredient(name: string, canonicalName: string | null): Promise<string> {
  const [inserted] = await sql`
    insert into ingredients (name, canonical_name, nomenclature, created_by, updated_by)
    values (
      ${name},
      ${canonicalName},
      ${canonicalName === null ? 'none' : 'botanical'},
      ${AUTHOR},
      ${AUTHOR}
    )
    returning id
  `;
  return inserted.id as string;
}

// Enough rows that the table is not trivially scannable, and varied enough that
// the trigram index has something to discriminate on. The planner assertions
// below disable sequential scans rather than relying on this volume — see the
// comment there — but a one-row table would make "the index was chosen" a much
// weaker statement than it reads as.
async function fillWithDecoys(): Promise<void> {
  await sql`
    insert into ingredients (name, canonical_name, nomenclature, created_by, updated_by)
    select 'Decoy ' || g, 'Decoyus ' || g, 'botanical', ${AUTHOR}, ${AUTHOR}
    from generate_series(1, 2000) g
  `;
  await sql`analyze ingredients`;
}

// `explain` as one string, which is what the plan assertions match against.
// Sequential scans are disabled for the duration: on a table this size the
// planner would seq-scan even a perfectly usable index because the whole heap
// costs less than the bitmap, and the question being asked is "can this
// predicate reach the index at all", not "is it cheap today". It is also the
// stronger form of the `similarity()` assertion — DESIGN.md §9's claim is that
// a function call cannot use a trigram index *even with sequential scans
// disabled*, and with them enabled a seq scan proves nothing.
async function planFor(query: string, threshold = 0.4): Promise<string> {
  return await sql.begin(async (tx) => {
    await tx.unsafe(`set local pg_trgm.similarity_threshold = ${threshold}`);
    await tx`set local enable_seqscan = off`;
    const rows = await tx.unsafe(`explain ${query}`);
    return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
  });
}

async function matchingNames(term: string, threshold?: number): Promise<string[]> {
  const rows = await sql.begin(async (tx) => {
    if (threshold !== undefined) {
      await tx.unsafe(`set local pg_trgm.similarity_threshold = ${threshold}`);
    }
    return await tx`
      select name from ingredients where name % ${term} order by similarity(name, ${term}) desc
    `;
  });
  return rows.map((row) => row.name as string);
}

async function indexDefinition(table: string, name: string): Promise<string | undefined> {
  const [found] = await sql`
    select pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = ${table}::regclass and c.relname = ${name}
  `;
  return found?.definition as string | undefined;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  await sql`drop table if exists ingredient_folk_names`;
  await sql`drop table if exists ingredients`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`create table if not exists workspaces (id uuid primary key)`;
  await sql`insert into users (id) values (${AUTHOR}) on conflict do nothing`;

  for (const statement of migrationStatementsContaining('CREATE TABLE "ingredients"')) {
    await sql.unsafe(statement);
  }
  for (const statement of migrationStatementsContaining('CREATE TABLE "ingredient_folk_names"')) {
    await sql.unsafe(statement);
  }
  for (const statement of migrationStatementsContaining(TRIGRAM_MIGRATION)) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from ingredient_folk_names`;
  await sql`delete from ingredients`;
});

afterAll(async () => {
  await sql`drop table if exists ingredient_folk_names`;
  await sql`drop table if exists ingredients`;
  await sql`drop type if exists nomenclature_kind`;
  await sql`drop type if exists ingredient_element`;
  await sql`drop table if exists workspaces`;
  await sql`drop table if exists users`;
  await sql.end();
});

describe('pg_trgm', () => {
  // Enabled by migration 0000, and baked into the Postgres image on top of that
  // (Docker/postgres-init/). Asserted here rather than assumed because every
  // other test in this file is meaningless without it — `gin_trgm_ops` would
  // not even be a resolvable operator class.
  it('is installed in this database', async () => {
    const rows = await sql`select extname from pg_extension where extname = 'pg_trgm'`;

    expect(rows.map((row) => row.extname as string)).toEqual(['pg_trgm']);
  });
});

describe('ingredients trigram index', () => {
  describe('catalogue introspection', () => {
    it('covers name and canonical_name in one gin index (DESIGN.md §9)', async () => {
      const definition = await indexDefinition('ingredients', TRIGRAM_INDEX);

      expect(definition).toContain('USING gin (name gin_trgm_ops, canonical_name gin_trgm_ops)');
    });

    it('carries no predicate, so every live row is reachable through it', async () => {
      const [found] = await sql`
        select i.indisunique as unique, pg_get_expr(i.indpred, i.indrelid) as predicate
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = 'ingredients'::regclass and c.relname = ${TRIGRAM_INDEX}
      `;

      expect(found?.unique).toBe(false);
      expect(found?.predicate).toBeNull();
    });
  });

  // The acceptance criterion that a multicolumn index is enough: one index, and
  // a predicate naming either column on its own reaches it.
  describe('the planner reaches it from either column alone', () => {
    beforeEach(async () => {
      await addIngredient('Mugwort', 'Artemisia vulgaris');
      await fillWithDecoys();
    });

    it('uses it for a predicate on name alone', async () => {
      const plan = await planFor(`select id from ingredients where name % 'Mugwart'`);

      expect(plan).toContain(`Bitmap Index Scan on ${TRIGRAM_INDEX}`);
    });

    it('uses it for a predicate on canonical_name alone', async () => {
      const plan = await planFor(
        `select id from ingredients where canonical_name % 'Artemisia vulgare'`,
      );

      expect(plan).toContain(`Bitmap Index Scan on ${TRIGRAM_INDEX}`);
    });

    // DESIGN.md §9's trap, asserted rather than described: `similarity(a, b) >
    // 0.4` is a function call, and no trigram index can answer one. The two
    // forms return identical rows, so the plan is the only thing that tells
    // them apart — and this runs with sequential scans already disabled, so a
    // seq scan here is the planner having no alternative rather than
    // preferring one.
    it('cannot be reached by a similarity() comparison, even with seq scans off', async () => {
      const plan = await planFor(
        `select id from ingredients where similarity(name, 'Mugwart') > 0.4`,
      );

      expect(plan).toContain('Seq Scan on ingredients');
      expect(plan).not.toContain(TRIGRAM_INDEX);
    });

    // Why the two assertions above could have passed for the wrong reason: if
    // `%` could not reach the index either, the first two would have read the
    // same as this one. They don't, and that difference is the whole rule.
    it('is what separates the two forms — same rows, different plans', async () => {
      const operatorPlan = await planFor(`select id from ingredients where name % 'Mugwart'`);
      const functionPlan = await planFor(
        `select id from ingredients where similarity(name, 'Mugwart') > 0.4`,
      );

      expect(operatorPlan).not.toEqual(functionPlan);
      expect(await matchingNames('Mugwart', 0.4)).toEqual(['Mugwort']);
    });
  });

  // M4.4a's index, asserted here to be independently reachable: the acceptance
  // criterion is that folk names match through their own index rather than
  // through this table's.
  describe('the folk-names index stays independent (M4.4a)', () => {
    it('is reached for a predicate on ingredient_folk_names.name', async () => {
      const mugwort = await addIngredient('Mugwort', 'Artemisia vulgaris');
      await sql`
        insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
        select ${mugwort}, 'Folk ' || g, ${AUTHOR}, ${AUTHOR} from generate_series(1, 2000) g
      `;
      await sql`
        insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
        values (${mugwort}, 'Cronewort', ${AUTHOR}, ${AUTHOR})
      `;
      await sql`analyze ingredient_folk_names`;

      const plan = await planFor(`select id from ingredient_folk_names where name % 'Cronewart'`);

      expect(plan).toContain(`Bitmap Index Scan on ${FOLK_NAMES_TRIGRAM_INDEX}`);
      expect(plan).not.toContain(TRIGRAM_INDEX);
    });
  });

  // `%` alone means "similar by pg_trgm.similarity_threshold", which defaults
  // to 0.3 — not the 0.4 DESIGN.md §9 wants. Setting it per transaction is
  // what makes the operator mean what the design says, and these assert both
  // halves: that it changes the answer, and that it does not leak past the
  // transaction that set it.
  describe('the similarity threshold is set per transaction', () => {
    beforeEach(async () => {
      // 0.4545 against 'Mugwart' — above 0.4, so it survives either threshold.
      await addIngredient('Mugwort', 'Artemisia vulgaris');
      // 0.3125 against 'Mugwart' — above the 0.3 default, below 0.4. The one
      // row whose fate the threshold decides, and a realistic one: a member
      // typing a second label for a thing already in the drawer is story 16.
      await addIngredient('Mugwort Leaf', null);
    });

    it('excludes a 0.31 near-miss at 0.4 that the default would have returned', async () => {
      expect(await matchingNames('Mugwart', 0.4)).toEqual(['Mugwort']);
      // Why that could have been an empty fixture or a broken query: at the
      // database's own default the same term over the same two rows returns
      // both. The threshold is what dropped the second row, not the data.
      expect(await matchingNames('Mugwart')).toEqual(['Mugwort', 'Mugwort Leaf']);
    });

    it('leaves the database default untouched once the transaction ends', async () => {
      await matchingNames('Mugwart', 0.4);

      const [row] = await sql`show pg_trgm.similarity_threshold`;

      expect(Number(row['pg_trgm.similarity_threshold'])).toBe(0.3);
    });
  });

  // 0000 enables the extension with `IF NOT EXISTS` because the Postgres image
  // bakes it in outside the journal; this migration is written the same way for
  // the same class of reason. `__drizzle_migrations` already makes `db:migrate`
  // skip an applied migration, so this is the belt to that braces — and cheap
  // enough that the criterion asking for it costs one keyword.
  describe('the migration is idempotent', () => {
    it('applies a second time without error', async () => {
      for (const statement of migrationStatementsContaining(TRIGRAM_MIGRATION)) {
        await sql.unsafe(statement);
      }

      // Still exactly one gin index on the table, not a second alongside it.
      const rows = await sql`
        select c.relname as name
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        join pg_am am on am.oid = c.relam
        where i.indrelid = 'ingredients'::regclass and am.amname = 'gin'
        order by c.relname
      `;

      expect(rows.map((row) => row.name as string)).toEqual([TRIGRAM_INDEX]);
    });
  });
});

// The folk-names table's own declarations are asserted in
// ingredient-folk-names-schema.test.ts (M4.4a) and are not re-litigated here.
// This one line exists because the plan assertion above matches on that index's
// name as a string: rename it in the schema and the EXPLAIN test would go red
// with "the planner chose the wrong index", which is the wrong diagnosis. This
// reddens beside it with the right one.
describe('folk-names index name is the one M4.4a declared', () => {
  it('matches the constant this file plans against', () => {
    const { indexes } = getTableConfig(ingredientFolkNames);

    expect(indexes.map((index) => index.config.name)).toContain(FOLK_NAMES_TRIGRAM_INDEX);
  });
});
