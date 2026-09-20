import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from './support/database';
import { tableFacts } from './support/table-metadata';
import { MIGRATIONS_DIR } from '../support/paths';
import { ingredientFolkNames } from '@/db/schema/ingredient-folk-names';
import { ingredients } from '@/db/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';

// §9's one multicolumn gin index serves a predicate on either column alone,
// which the planner assertions below prove —
// claude-docs/db.md, "Fuzzy matching: one index, and a rule every caller is bound by".
const TRIGRAM_INDEX = 'ingredients_trgm';
const FOLK_NAMES_TRIGRAM_INDEX = 'ingredient_folk_names_trgm';

// Named so the declaration test says the trigram index joined them, not replaced one.
const UNIQUE_INDEXES = [
  'ingredients_compendium_identity_unique',
  'ingredients_workspace_identity_unique',
  'ingredients_workspace_label_unique',
];

describe('ingredients trigram index declaration', () => {
  const { byIndexName: byName } = tableFacts(ingredients);

  it('declares the trigram index beside M4.1a’s three unique ones', () => {
    expect(Object.keys(byName).sort()).toEqual([...UNIQUE_INDEXES, TRIGRAM_INDEX].sort());
  });

  it('builds it as a gin index over both names', () => {
    expect(byName[TRIGRAM_INDEX].config.method).toBe('gin');
    expect(byName[TRIGRAM_INDEX].config.columns).toHaveLength(2);
  });

  // Uniqueness is the other three's job, and a partial predicate would narrow
  // the planner's choice over rows a finder already filters out.
  it('makes it neither unique nor partial', () => {
    expect(byName[TRIGRAM_INDEX].config.unique).toBe(false);
    expect(byName[TRIGRAM_INDEX].config.where).toBeUndefined();
  });
});

// The migration reader survives for the idempotency test at the bottom.

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

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

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

// Enough varied rows that "the index was chosen" means something; the planner
// assertions disable sequential scans regardless.
async function fillWithDecoys(): Promise<void> {
  await sql`
    insert into ingredients (name, canonical_name, nomenclature, created_by, updated_by)
    select 'Decoy ' || g, 'Decoyus ' || g, 'botanical', ${AUTHOR}, ${AUTHOR}
    from generate_series(1, 2000) g
  `;
  await sql`analyze ingredients`;
}

// `explain` as one string, with sequential scans disabled: on a table this
// size the planner would seq-scan past a usable index because the heap costs
// less, and the question is "can this predicate reach the index at all". With
// seq scans on, the `similarity()` assertion below would prove nothing.
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

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

describe('pg_trgm', () => {
  // Enabled by migration 0000; asserted because `gin_trgm_ops` is not resolvable without it.
  it('is installed in this database', async () => {
    const rows = await sql`select extname from pg_extension where extname = 'pg_trgm'`;

    expect(rows.map((row) => row.extname as string)).toEqual(['pg_trgm']);
  });
});

describe('ingredients trigram index', () => {
  describe('catalogue introspection', () => {
    it('covers name and canonical_name in one gin index (DESIGN.md §9)', async () => {
      const index = await catalogue.indexRow('ingredients', TRIGRAM_INDEX);

      expect(index?.definition).toContain(
        'USING gin (name gin_trgm_ops, canonical_name gin_trgm_ops)',
      );
    });

    it('carries no predicate, so every live row is reachable through it', async () => {
      const index = await catalogue.indexRow('ingredients', TRIGRAM_INDEX);

      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBeNull();
    });
  });

  // One index, reached from either column alone.
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

    // §9's trap: `similarity(a, b) > 0.4` is a function call no trigram index
    // can answer. Seq scans are already off, so a seq scan here is the planner
    // having no alternative rather than preferring one.
    it('cannot be reached by a similarity() comparison, even with seq scans off', async () => {
      const plan = await planFor(
        `select id from ingredients where similarity(name, 'Mugwart') > 0.4`,
      );

      expect(plan).toContain('Seq Scan on ingredients');
      expect(plan).not.toContain(TRIGRAM_INDEX);
    });

    // Why the two above could have passed wrongly: if `%` could not reach the
    // index either, their plans would read like this one.
    it('is what separates the two forms — same rows, different plans', async () => {
      const operatorPlan = await planFor(`select id from ingredients where name % 'Mugwart'`);
      const functionPlan = await planFor(
        `select id from ingredients where similarity(name, 'Mugwart') > 0.4`,
      );

      expect(operatorPlan).not.toEqual(functionPlan);
      expect(await matchingNames('Mugwart', 0.4)).toEqual(['Mugwort']);
    });
  });

  // Folk names match through their own index, never this table's.
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

  // `%` means "similar by pg_trgm.similarity_threshold", default 0.3 rather
  // than §9's 0.4. Set per transaction; asserted both to change the answer and
  // not to leak past the transaction.
  describe('the similarity threshold is set per transaction', () => {
    beforeEach(async () => {
      // 0.4545 against 'Mugwart' — above 0.4, so it survives either threshold.
      await addIngredient('Mugwort', 'Artemisia vulgaris');
      // 0.3125 against 'Mugwart' — above the 0.3 default, below 0.4: the one
      // row the threshold decides.
      await addIngredient('Mugwort Leaf', null);
    });

    it('excludes a 0.31 near-miss at 0.4 that the default would have returned', async () => {
      expect(await matchingNames('Mugwart', 0.4)).toEqual(['Mugwort']);
      // At the database default the same rows return both, so the threshold
      // dropped the second row, not the data.
      expect(await matchingNames('Mugwart')).toEqual(['Mugwort', 'Mugwort Leaf']);
    });

    it('leaves the database default untouched once the transaction ends', async () => {
      await matchingNames('Mugwart', 0.4);

      const [row] = await sql`show pg_trgm.similarity_threshold`;

      expect(Number(row['pg_trgm.similarity_threshold'])).toBe(0.3);
    });
  });

  // `IF NOT EXISTS`, like 0000's extension: belt to `__drizzle_migrations`' braces.
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

// The plan assertion above matches this index's name as a string; a rename
// would redden it as "wrong index chosen". This reddens beside it, correctly.
describe('folk-names index name is the one M4.4a declared', () => {
  it('matches the constant this file plans against', () => {
    const { indexes } = tableFacts(ingredientFolkNames);

    expect(indexes.map((index) => index.config.name)).toContain(FOLK_NAMES_TRIGRAM_INDEX);
  });
});
