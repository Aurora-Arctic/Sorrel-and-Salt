import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { makeIngredient } from '../../../support/fixtures';
import { ingredientVariants } from '@/modules/ingredients/schema/ingredient-variants';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// DESIGN.md §5's `ingredient_variants`: one row per form of an
// ingredient, carrying what is particular to that form. The columns' types,
// keys and index names are the drift test's; the audit set and the trigger
// are their sweeps'; a second live row of one key and its soft-delete pair are
// the partial-unique sweep's (claude-docs/testing/db-harness.md).
const OWN_COLUMNS = [
  'id',
  'ingredient_id',
  'form',
  'form_id',
  'description',
  'safety_notes',
  'toxic',
  'elements',
  'celestial_bodies',
  'zodiac_signs',
  'colors',
];

const FORM_UNIQUE = 'ingredient_variants_form_unique';
const FORM_NOT_BLANK = 'ingredient_variants_form_not_blank';

describe('ingredient_variants schema', () => {
  const { byName } = tableFacts(ingredientVariants);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A fresh ingredient with no form, so the shared inserter writes it no variant. */
async function aParent(): Promise<string> {
  const t = crypto.randomUUID().slice(0, 8);
  return insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: `Testwort ${t}`,
      canonicalName: `Fixtura testalis ${t}`,
      variants: [],
    }),
    AUTHOR,
  );
}

async function addVariant(ingredientId: string, form: string): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_variants ${sql({
      ingredient_id: ingredientId,
      form,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  return inserted.id as string;
}

const formsOf = async (ingredientId: string) =>
  (
    await sql`
      select form from ingredient_variants
      where ingredient_id = ${ingredientId} and deleted_at is null order by form
    `
  ).map((row) => row.form as string);

let PARENT: string;

beforeAll(async () => {
  PARENT = await aParent();
});

describe('ingredient_variants table', () => {
  // NOT NULL alone accepts '': a blank form would key nothing.
  it('refuses a blank form, and takes a named one', async () => {
    const parent = await aParent();
    await addVariant(parent, 'Testleaf');

    const error = await failureOf(addVariant(parent, '   '));

    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe(FORM_NOT_BLANK);
    expect(await formsOf(parent)).toEqual(['Testleaf']);
  });

  // The table's identity rule: one live row per ingredient and folded form,
  // so ` testleaf ` is the form `Testleaf` is, and `Testroot` another.
  it('refuses a second live variant folding to the same form, and takes a different one', async () => {
    const parent = await aParent();
    await addVariant(parent, 'Testleaf');

    const error = await failureOf(addVariant(parent, '  testleaf '));
    await addVariant(parent, 'Testroot');

    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe(FORM_UNIQUE);
    expect(await formsOf(parent)).toEqual(['Testleaf', 'Testroot']);
  });

  // Why the refusal could have been a success: the same form is free on another ingredient.
  it('takes a form another ingredient already holds', async () => {
    await addVariant(PARENT, 'Testbark');
    const other = await aParent();

    await addVariant(other, 'Testbark');

    expect(await formsOf(other)).toEqual(['Testbark']);
  });
});
