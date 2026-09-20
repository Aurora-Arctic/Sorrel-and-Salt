import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from './support/database';
import { AUDIT_COLUMNS, tableFacts } from './support/table-metadata';
import { ingredientFolkNames } from '@/db/schema/ingredient-folk-names';
import { ingredients } from '@/db/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';

// DESIGN.md §5's two indexes, transcribed by name.
const UNIQUE_INDEX = 'ingredient_folk_names_unique';
const TRIGRAM_INDEX = 'ingredient_folk_names_trgm';
const INGREDIENT_FK = 'ingredient_folk_names_ingredient_id_ingredients_id_fk';

describe('ingredient_folk_names schema', () => {
  const { byName, byIndexName: indexByName, foreignKeyByColumn } = tableFacts(ingredientFolkNames);

  // The full six, not the join tables' four: a folk name is content rather than
  // a link, so removing one leaves a tombstone and the unique index is partial.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'ingredient_id', 'name', ...AUDIT_COLUMNS].sort(),
    );
  });

  // Not keyed on the pair: `(ingredient_id, lower(name))` is unique only among
  // live rows, and a primary key carries no predicate.
  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  it('requires an ingredient and a name', () => {
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(byName.name.notNull).toBe(true);
  });

  it('points at the ingredient that claims the name', () => {
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
  });

  it('declares exactly the two indexes DESIGN.md §5 names', () => {
    expect(Object.keys(indexByName).sort()).toEqual([UNIQUE_INDEX, TRIGRAM_INDEX].sort());
  });

  // Rule 4: without the predicate a soft-deleted folk name reserves its spelling forever.
  it('makes the uniqueness index unique and partial', () => {
    expect(indexByName[UNIQUE_INDEX].config.unique).toBe(true);
    expect(indexByName[UNIQUE_INDEX].config.where).toBeDefined();
  });

  // Two ingredients sharing a common name must both be indexed under it.
  it('makes the trigram index neither unique nor partial', () => {
    expect(indexByName[TRIGRAM_INDEX].config.unique).toBe(false);
    expect(indexByName[TRIGRAM_INDEX].config.where).toBeUndefined();
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
// Uncaria tomentosa, the vine. Displays "Cat's Claw".
let UNCARIA: string;
// Senegalia greggii, an unrelated plant that also displays "Cat's Claw" — §5's
// own example, and why uniqueness is per ingredient rather than global.
let ACACIA: string;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

async function compendiumIdOf(canonicalName: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients
    where workspace_id is null and canonical_name = ${canonicalName} and deleted_at is null
  `;
  if (!found) throw new Error(`The standard seed carries no compendium row for ${canonicalName}`);
  return found.id as string;
}

async function addFolkName(ingredientId: string, name: string): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
    values (${ingredientId}, ${name}, ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  return inserted.id as string;
}

async function softDelete(id: string): Promise<void> {
  await sql`
    update ingredient_folk_names set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
  `;
}

async function liveNames(ingredientId: string): Promise<string[]> {
  const rows = await sql`
    select name from ingredient_folk_names
    where ingredient_id = ${ingredientId} and deleted_at is null
    order by name
  `;
  return rows.map((row) => row.name as string);
}

beforeAll(async () => {
  UNCARIA = await compendiumIdOf('Uncaria tomentosa');
  ACACIA = await compendiumIdOf('Senegalia greggii');
});

beforeEach(async () => {
  await sql`truncate ingredient_folk_names`;
});

describe('ingredient_folk_names table', () => {
  it('carries the six audit columns beside the id, the ingredient and the name', async () => {
    expect(await catalogue.columnNames('ingredient_folk_names')).toEqual(
      ['id', 'ingredient_id', 'name', ...AUDIT_COLUMNS].sort(),
    );
  });

  // The rendered predicate, not "some predicate": a dropped WHERE widens the
  // reservation to forever, and only the re-add test below would notice.
  describe('catalogue introspection', () => {
    it('makes the folded name unique per ingredient, among live rows only', async () => {
      const index = await catalogue.indexRow('ingredient_folk_names', UNIQUE_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      // `ingredient_id` leads, so uniqueness is per ingredient; `lower(name)` folds case.
      expect(index?.definition).toContain('USING btree (ingredient_id, lower(name))');
    });

    it('indexes the name for trigram matching (DESIGN.md §9)', async () => {
      const index = await catalogue.indexRow('ingredient_folk_names', TRIGRAM_INDEX);

      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBeNull();
      expect(index?.definition).toContain('USING gin (name gin_trgm_ops)');
    });

    it('carries no unique index beyond the primary key and that one', async () => {
      expect(await catalogue.uniqueIndexNames('ingredient_folk_names')).toEqual([
        'ingredient_folk_names_pkey',
        UNIQUE_INDEX,
      ]);
    });
  });

  describe('uniqueness is per ingredient', () => {
    it('refuses the same folk name twice on one ingredient', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");

      const error = await failureOf(addFolkName(UNCARIA, "Cat's Claw"));

      // 23505 is unique_violation, named: this index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    it('folds case, so Cat’s Claw and cat’s claw are one name', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");

      const error = await failureOf(addFolkName(UNCARIA, "cat's claw"));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    // §5's documented case: two unrelated plants both answer to "Cat's Claw".
    it('lets two unrelated ingredients both claim one common name', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");

      await addFolkName(ACACIA, "Cat's Claw");

      expect(await liveNames(UNCARIA)).toEqual(["Cat's Claw"]);
      expect(await liveNames(ACACIA)).toEqual(["Cat's Claw"]);
      // Why it could have passed: the same spelling on one ingredient is
      // refused, so the ingredient scoping admitted the second row.
      const error = await failureOf(addFolkName(ACACIA, "cat's claw"));
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    it('lets one ingredient hold several folk names', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");
      await addFolkName(UNCARIA, 'Uña de Gato');

      expect(await liveNames(UNCARIA)).toEqual(["Cat's Claw", 'Uña de Gato']);
    });
  });

  // Rule 4 end to end: a folk name removed by mistake must be re-addable.
  describe('re-adding a removed folk name', () => {
    it('succeeds after a soft delete', async () => {
      const id = await addFolkName(UNCARIA, "Cat's Claw");
      await softDelete(id);

      const readded = await addFolkName(UNCARIA, "Cat's Claw");

      expect(readded).not.toBe(id);
      expect(await liveNames(UNCARIA)).toEqual(["Cat's Claw"]);
    });

    it('leaves the tombstone in place rather than resurrecting it', async () => {
      const id = await addFolkName(UNCARIA, "Cat's Claw");
      await softDelete(id);
      await addFolkName(UNCARIA, "Cat's Claw");

      const rows = await sql`
        select id from ingredient_folk_names
        where ingredient_id = ${UNCARIA} and deleted_at is not null
      `;

      expect(rows.map((row) => row.id as string)).toEqual([id]);
    });
  });

  describe('a folk name belongs to a real ingredient', () => {
    it('refuses an ingredient id no ingredient holds', async () => {
      const error = await failureOf(addFolkName(ABSENT, "Cat's Claw"));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });

    it('refuses an insert naming no ingredient', async () => {
      const error = await failureOf(sql`
        insert into ingredient_folk_names (name, created_by, updated_by)
        values ('Cat''s Claw', ${AUTHOR}, ${AUTHOR})
      `);

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('ingredient_id');
    });

    it('refuses an insert carrying no name', async () => {
      const error = await failureOf(sql`
        insert into ingredient_folk_names (ingredient_id, created_by, updated_by)
        values (${UNCARIA}, ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('name');
    });
  });
});
