import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { tableFacts } from '../../../support/db/table-metadata';
import { MIGRATIONS_DIR } from '../../../support/paths';
import { ingredientFolkNames } from '@/modules/ingredients/schema/ingredient-folk-names';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { ingredientSlug } from '@/lib/slugify';

// The compendium search folds accents through `unaccent_immutable`, and the
// two expression indexes are what let a fold reach a trigram index at all —
// claude-docs/db.md, "The compendium read".
const UNACCENT_INDEX = 'ingredients_unaccent_trgm';
const FOLK_NAMES_UNACCENT_INDEX = 'ingredient_folk_names_unaccent_trgm';
const WRAPPER = 'unaccent_immutable';

describe('unaccent index declarations', () => {
  const { byIndexName: onIngredients } = tableFacts(ingredients);
  const { byIndexName: onFolkNames } = tableFacts(ingredientFolkNames);

  it('declares a gin index over the folded name and formal name', () => {
    expect(onIngredients[UNACCENT_INDEX].config.method).toBe('gin');
    expect(onIngredients[UNACCENT_INDEX].config.columns).toHaveLength(2);
  });

  it('declares a gin index over the folded folk name', () => {
    expect(onFolkNames[FOLK_NAMES_UNACCENT_INDEX].config.method).toBe('gin');
    expect(onFolkNames[FOLK_NAMES_UNACCENT_INDEX].config.columns).toHaveLength(1);
  });

  // As the raw trigram indexes are: uniqueness is the unique indexes' job, and a
  // predicate would narrow the planner's choice over rows a finder filters anyway.
  it('makes both neither unique nor partial', () => {
    for (const index of [onIngredients[UNACCENT_INDEX], onFolkNames[FOLK_NAMES_UNACCENT_INDEX]]) {
      expect(index.config.unique).toBe(false);
      expect(index.config.where).toBeUndefined();
    }
  });
});

function migrationStatementsContaining(marker: string): string[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
    .filter((path) => readFileSync(path, 'utf8').includes(marker));
  if (files.length === 0) throw new Error(`No migration contains ${marker}`);
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean),
  );
}

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

async function addIngredient(name: string, canonicalName: string | null): Promise<string> {
  const [inserted] = await sql`
    insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
    values (
      ${name},
      ${ingredientSlug(name, null, canonicalName)},
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
    insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
    select 'Decoy ' || g, 'decoy-' || g, 'Decoyus ' || g, 'botanical', ${AUTHOR}, ${AUTHOR}
    from generate_series(1, 2000) g
  `;
  await sql`analyze ingredients`;
}

// `explain` as one string, with sequential scans disabled: the question is
// "can this predicate reach the index at all", not what the planner prefers
// on a small table.
async function planFor(query: string): Promise<string> {
  return await sql.begin(async (tx) => {
    await tx`set local enable_seqscan = off`;
    const rows = await tx.unsafe(`explain ${query}`);
    return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
  });
}

// Which rows match, not the order they come in: sorted here by code unit, so
// the expectation does not depend on the database's collation.
async function namesMatching(term: string): Promise<string[]> {
  const rows = await sql`
    select name from ingredients
    where unaccent_immutable(${term}) <% unaccent_immutable(name)
  `;
  return rows.map((row) => row.name as string).sort();
}

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

describe('unaccent', () => {
  // Enabled by migration 0026; asserted because the wrapper below cannot exist without it.
  it('is installed in this database', async () => {
    const rows = await sql`select extname from pg_extension where extname = 'unaccent'`;

    expect(rows.map((row) => row.extname as string)).toEqual(['unaccent']);
  });

  it('strips diacritics through the wrapper', async () => {
    const [row] = await sql`select ${sql.unsafe(WRAPPER)}('Uña de Gato') as folded`;

    expect(row.folded).toBe('Una de Gato');
  });

  // `unaccent()` itself is STABLE, because it reads a dictionary; an expression
  // index needs IMMUTABLE, which the wrapper declares by naming the dictionary.
  it('declares the wrapper immutable', async () => {
    const [row] = await sql`
      select provolatile from pg_proc where proname = ${WRAPPER}
    `;

    expect(row.provolatile).toBe('i');
  });
});

describe('the unaccent trigram indexes', () => {
  describe('catalogue introspection', () => {
    it('folds name and canonical_name in one gin index', async () => {
      const index = await catalogue.indexRow('ingredients', UNACCENT_INDEX);

      expect(index?.definition).toContain(
        `USING gin (${WRAPPER}(name) gin_trgm_ops, ${WRAPPER}(canonical_name) gin_trgm_ops)`,
      );
      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBeNull();
    });

    it('folds the folk name in its own gin index', async () => {
      const index = await catalogue.indexRow('ingredient_folk_names', FOLK_NAMES_UNACCENT_INDEX);

      expect(index?.definition).toContain(`USING gin (${WRAPPER}(name) gin_trgm_ops)`);
      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBeNull();
    });
  });

  describe('the planner reaches them from a folded word match', () => {
    beforeEach(async () => {
      await addIngredient("Cat's Claw", 'Uncaria tomentosa');
      await fillWithDecoys();
    });

    it('uses the ingredients index for a predicate on name alone', async () => {
      const plan = await planFor(
        `select id from ingredients where ${WRAPPER}('una') <% ${WRAPPER}(name)`,
      );

      expect(plan).toContain(`Bitmap Index Scan on ${UNACCENT_INDEX}`);
    });

    it('uses the ingredients index for a predicate on canonical_name alone', async () => {
      const plan = await planFor(
        `select id from ingredients where ${WRAPPER}('tomentosa') <% ${WRAPPER}(canonical_name)`,
      );

      expect(plan).toContain(`Bitmap Index Scan on ${UNACCENT_INDEX}`);
    });

    it('uses the folk-names index for a predicate on a folk name', async () => {
      const [{ id }] = await sql`select id from ingredients where name = 'Cat''s Claw'`;
      await sql`
        insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
        select ${id as string}, 'Folk ' || g, ${AUTHOR}, ${AUTHOR} from generate_series(1, 2000) g
      `;
      await sql`
        insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
        values (${id as string}, 'Uña de Gato', ${AUTHOR}, ${AUTHOR})
      `;
      await sql`analyze ingredient_folk_names`;

      const plan = await planFor(
        `select id from ingredient_folk_names where ${WRAPPER}('una') <% ${WRAPPER}(name)`,
      );

      expect(plan).toContain(`Bitmap Index Scan on ${FOLK_NAMES_UNACCENT_INDEX}`);
      expect(plan).not.toContain(UNACCENT_INDEX);
    });
  });

  // Why the plans above mean something: the fold changes the answer, both ways.
  describe('the fold matches across accents', () => {
    beforeEach(async () => {
      await addIngredient('Uña de Gato', null);
      await addIngredient('Una de Gato Root', null);
    });

    it('finds an accented name from an unaccented term', async () => {
      expect(await namesMatching('una de gato')).toEqual(['Una de Gato Root', 'Uña de Gato']);
    });

    it('finds an unaccented name from an accented term', async () => {
      expect(await namesMatching('uña de gato')).toEqual(['Una de Gato Root', 'Uña de Gato']);
    });
  });

  // `IF NOT EXISTS` and `OR REPLACE`, like 0000 and 0016: belt to
  // `__drizzle_migrations`' braces.
  describe('the migrations are idempotent', () => {
    it('apply a second time without error', async () => {
      for (const statement of migrationStatementsContaining(WRAPPER)) {
        await sql.unsafe(statement);
      }

      // Still one folded index per table, not a second alongside it.
      const rows = await sql`
        select c.relname as name
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where c.relname like '%unaccent_trgm%'
        order by c.relname
      `;
      expect(rows.map((row) => row.name as string)).toEqual([
        FOLK_NAMES_UNACCENT_INDEX,
        UNACCENT_INDEX,
      ]);
    });
  });
});
