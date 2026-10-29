import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import {
  createCompendiumEntry,
  createWorkspaceIngredient,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { variantIdOf } from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';

// An ingredient and each of its forms carry a toxic flag of their
// own, written by whoever may write the row. Who may write it is the write path's
// own test (workspace-ingredients.test.ts, compendium-entries.test.ts). The two are
// independent — the one property that does not follow DESIGN.md §5's union
// rule — so each test reads both back. The table is emptied per test, so
// every row a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// A compendium entry's every form is a pick, so its two forms are
// curated rows, read once by name.
let formIds: Map<string, string>;
beforeAll(async () => {
  const rows = await sql`
    select id, lower(name) as fold from ingredient_forms
    where deleted_at is null and lower(name) in ('herb', 'oil')`;
  formIds = new Map(rows.map((row) => [row.fold as string, row.id as string]));
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const FORMS = ['Herb', 'Oil'] as const;
type Form = (typeof FORMS)[number];

/** A fixture with the two forms, in the compendium unless a coven is named. */
const twoForms = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ variants: FORMS.map((form) => makeVariant({ form })), ...overrides });

const local = () =>
  twoForms({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', canonicalName: null });

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

/**
 * The fixture as a whole-row write, the ingredient's flag as `toxic` and
 * each form's as `toxicForms` names it, every form kept by its id.
 */
async function input(
  id: string,
  fixture: IngredientFixture,
  { toxic = false, toxicForms = [] }: { toxic?: boolean; toxicForms?: Form[] } = {},
) {
  const {
    workspaceId,
    categories: _categories,
    substitutes: _substitutes,
    deities: _deities,
    variants,
    ...fields
  } = fixture;
  return {
    ...fields,
    toxic,
    substitutes: [],
    deities: [],
    references: [],
    categoryIds: [],
    variants: await Promise.all(
      variants.map(async (variant) =>
        variantInput(variant, {
          id: await variantIdOf(sql, id, variant.form),
          formId: workspaceId ? '' : (formIds.get(variant.form.toLowerCase()) ?? ''),
          toxic: toxicForms.includes(variant.form as Form),
        }),
      ),
    ),
  };
}

/** The flags as the rows hold them: the ingredient's, and each live form's by name. */
async function flagsOf(id: string) {
  const [row] = await sql`select toxic, updated_by from ingredients where id = ${id}`;
  const forms = await sql`
    select form, toxic, updated_by from ingredient_variants
    where ingredient_id = ${id} and deleted_at is null order by form`;
  return {
    toxic: row.toxic as boolean,
    forms: Object.fromEntries(forms.map((form) => [form.form as string, form.toxic as boolean])),
    updatedBy: [row.updated_by, ...forms.map((form) => form.updated_by)] as string[],
  };
}

const NOTHING_TOXIC = { toxic: false, forms: { Herb: false, Oil: false } };

describe('a compendium entry’s toxic flags', () => {
  it('start off on a new entry and its forms when the admin leaves them unsaid', async () => {
    const fixture = twoForms();
    const { workspaceId: _tier, categories: _c, substitutes: _s, deities: _d, ...fields } = fixture;

    const created = await createCompendiumEntry(asUser(E), {
      ...fields,
      substitutes: [],
      deities: [],
      variants: fixture.variants.map((variant) =>
        variantInput(variant, { formId: formIds.get(variant.form.toLowerCase()) ?? '' }),
      ),
    });

    expect(await flagsOf(created.id)).toMatchObject(NOTHING_TOXIC);
  });

  it('lets the site admin set either flag, each leaving the other as it was', async () => {
    const fixture = twoForms();
    const id = await seed(fixture);

    await updateCompendiumEntry(asUser(E), id, await input(id, fixture, { toxic: true }));
    const ingredientOnly = await flagsOf(id);
    await updateCompendiumEntry(asUser(E), id, await input(id, fixture, { toxicForms: ['Oil'] }));
    const formOnly = await flagsOf(id);

    expect(ingredientOnly).toMatchObject({ toxic: true, forms: { Herb: false, Oil: false } });
    expect(formOnly).toMatchObject({ toxic: false, forms: { Herb: false, Oil: true } });
    expect(formOnly.updatedBy).toEqual([E.id, E.id, E.id]);
  });
});

describe('a coven ingredient’s toxic flags', () => {
  it('start off on a new ingredient and its forms when the member leaves them unsaid', async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Testwort',
      variants: FORMS.map((form) => variantInput(makeVariant({ form }))),
    });

    expect(await flagsOf(created.id)).toMatchObject(NOTHING_TOXIC);
  });

  it('lets an owner and a member set either flag, each leaving the other as it was', async () => {
    const fixture = local();
    const id = await seed(fixture);

    await updateWorkspaceIngredient(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      await input(id, fixture, { toxic: true }),
    );
    const byOwner = await flagsOf(id);
    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      await input(id, fixture, { toxicForms: ['Herb'] }),
    );
    const byMember = await flagsOf(id);

    expect(byOwner).toMatchObject({ toxic: true, forms: { Herb: false, Oil: false } });
    expect(byMember).toMatchObject({ toxic: false, forms: { Herb: true, Oil: false } });
    // The rows the member changed carry the member's stamp; the Oil form, which
    // the write left as it was, is not rewritten and keeps the seed's.
    expect(byMember.updatedBy).toEqual([B.id, B.id, A.id]);
  });
});
