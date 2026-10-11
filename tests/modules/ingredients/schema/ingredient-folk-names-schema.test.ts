import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientFolkNames } from '@/modules/ingredients/schema/ingredient-folk-names';
import { FIXTURE_USERS } from '@/db/seed/standard';

const UNIQUE_INDEX = 'ingredient_folk_names_unique';
const TRIGRAM_INDEX = 'ingredient_folk_names_trgm';

describe('ingredient_folk_names schema', () => {
  const { byName } = tableFacts(ingredientFolkNames);

  // The full six, not the join tables' four: a folk name is content rather than
  // a link, so removing one leaves a tombstone and the unique index is partial.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'ingredient_id', 'name', ...AUDIT_COLUMNS].sort(),
    );
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
// Uncaria tomentosa, the vine. Displays "Cat's Claw".
let UNCARIA: string;
// Senegalia greggii, an unrelated plant that also displays "Cat's Claw" — §5's
// own example, and why uniqueness is per ingredient rather than global.
let ACACIA: string;

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
  describe('uniqueness is per ingredient', () => {
    // 23505 is unique_violation, named: this index refused, not something earlier.
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
  });

  // The common-name lookup matches through it (DESIGN.md §9); not unique, so
  // two ingredients sharing a common name are both indexed under it.
  it('indexes the name for trigram matching', async () => {
    const index = await catalogue.indexRow('ingredient_folk_names', TRIGRAM_INDEX);

    expect(index?.unique).toBe(false);
    expect(index?.definition).toContain('USING gin (name gin_trgm_ops)');
  });
});
