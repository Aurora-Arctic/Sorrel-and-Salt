import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import { createWorkspaceIngredient, updateWorkspaceIngredient } from '@/modules/ingredients';
import { A, B, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient, insertVariant } from '../../../support/db/insert-ingredient';
import { insertReference } from '../../../support/db/insert-reference';
import {
  liveFormsOf,
  variantChildrenOf,
  variantIdOf,
  variantRowsOf,
} from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  makeIngredient,
  makeVariant,
  variantInput,
  type VariantInput,
} from '../../../support/fixtures';
import { inputOf, local } from '../../../support/workspace-ingredient-input';

// A coven ingredient's forms, split from workspace-ingredients.test.ts. The
// table is emptied per test, so every row a result could come from is one
// this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

/** The id of the transaction that last wrote the row — equal for two rows written in one. */
async function writtenBy(ingredientId: string): Promise<string> {
  const [row] = await sql`select xmin::text as xmin from ingredients where id = ${ingredientId}`;
  return row.xmin as string;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

// MB.219: an ingredient's forms are written inside its own save, each with its
// own substitutes, references and categories (DESIGN.md §5, "Variants are
// written inside the ingredient's save"). What the schema refuses is
// `validation/ingredient.test.ts`'s; what is read back is MB.218's.
describe('its forms', () => {
  let protection: string;
  let love: string;
  beforeEach(async () => {
    const rows = await sql`
      select name, id from categories where name in ('Protection', 'Love') and deleted_at is null`;
    const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
    protection = byName.get('Protection') as string;
    love = byName.get('Love') as string;
  });

  /** One whole form as the input sends it: every field, `overrides` over blanks. */
  const formOf = (overrides: Partial<VariantInput>) =>
    variantInput(makeVariant({ form: 'Testleaf' }), overrides);

  /** The fixture's input with `variants` as its forms. */
  const withForms = (...variants: Partial<VariantInput>[]) => ({
    ...inputOf(local()),
    variants: variants.map(formOf),
  });

  /** A compendium entry with its one fixture form: what a coven's substitute may link. */
  async function compendiumEntry(name: string) {
    const id = await seed(makeIngredient({ name, canonicalName: null, nomenclature: 'none' }));
    return { id, form: await variantIdOf(sql, id, 'Testform') };
  }

  it('creates two forms with the ingredient, each with its own categories, substitutes and references', async () => {
    const testroot = await compendiumEntry('Testroot');
    const source = await insertReference(sql, {}, A.id);

    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms(
        {
          form: 'Testleaf',
          description: 'Pressed.',
          celestialBodies: ['Venus'],
          categoryIds: [protection],
          substitutes: [
            { ingredientId: testroot.id, substituteVariantId: testroot.form },
            { name: 'Mock Root' },
          ],
          references: [{ referenceId: source, locator: 'p. 3' }],
        },
        { form: 'Testoil', safetyNotes: 'Dilute.', categoryIds: [love] },
      ),
    );

    const [leaf, oil] = await variantRowsOf(sql, created.id);
    expect([leaf, oil]).toMatchObject([
      { form: 'Testleaf', description: 'Pressed.', celestial_bodies: ['Venus'], deleted_at: null },
      { form: 'Testoil', safety_notes: 'Dilute.', deleted_at: null },
    ]);
    expect(await variantChildrenOf(sql, leaf.id)).toMatchObject({
      categories: [{ ingredient_id: created.id, category_id: protection }],
      substitutes: [
        { substitute_id: null, name: 'Mock Root' },
        { substitute_id: testroot.id, substitute_variant_id: testroot.form, name: null },
      ],
      // A form's link names the form alone.
      references: [{ ingredient_id: null, reference_id: source, locator: 'p. 3' }],
    });
    expect((await variantChildrenOf(sql, oil.id)).categories).toMatchObject([
      { category_id: love },
    ]);
    // The ingredient's own lists stay its own: nothing was filed on it.
    expect(
      await sql`select 1 from ingredient_categories where ingredient_id = ${created.id} and variant_id is null`,
    ).toHaveLength(0);
  });

  it('keeps a form by its id across a respelling, and one sent without an id by its text, drops the one left out and adds the new', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms(
        { form: 'Testleaf', categoryIds: [protection] },
        { form: 'Testoil', substitutes: [{ name: 'Mock Root' }] },
        { form: 'Testresin' },
      ),
    );
    const before = await variantRowsOf(sql, created.id);
    const id = (form: string) => before.find((row) => row.form === form)?.id as string;

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      withForms(
        { id: id('Testleaf'), form: 'Testleaves', categoryIds: [protection] },
        { form: ' TESTRESIN ' },
        { form: 'Testpowder' },
      ),
    );

    const after = await variantRowsOf(sql, created.id);
    expect(after.find((row) => row.id === id('Testleaf'))).toMatchObject({
      form: 'Testleaves',
      deleted_at: null,
    });
    expect(after.find((row) => row.id === id('Testresin'))).toMatchObject({
      form: 'TESTRESIN',
      deleted_at: null,
    });
    expect(after.find((row) => row.id === id('Testoil'))).toMatchObject({ deleted_by: B.id });
    expect(after.find((row) => row.form === 'Testpowder')).toMatchObject({ deleted_at: null });
    expect(after).toHaveLength(4);
    // The dropped form keeps its children for a restore; the kept, its pair.
    expect((await variantChildrenOf(sql, id('Testoil'))).substitutes).toMatchObject([
      { name: 'Mock Root' },
    ]);
    expect((await variantChildrenOf(sql, id('Testleaf'))).categories).toMatchObject([
      { category_id: protection },
    ]);
  });

  it("refuses a substitute's form that is not of the ingredient it links, on that form, writing nothing", async () => {
    const testroot = await compendiumEntry('Testroot');
    const mockwort = await compendiumEntry('Mockwort');
    const naming = (ingredientId: string) =>
      withForms({ substitutes: [{ ingredientId, substituteVariantId: mockwort.form }] });
    // Why it could have saved: the form is live, and is Mockwort's.
    await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...naming(mockwort.id),
      name: 'Testwort, kept',
    });

    const attempt = createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, naming(testroot.id));

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      issues: [{ path: ['variants', 0, 'substitutes', 0, 'substituteVariantId'] }],
    });
    expect(await countIngredients()).toBe(3);
  });

  // MB.115, the owner's call: a form stands in for a form, so a form's link
  // names one of what it links.
  it("refuses a form's link naming no form of what it links, at create and update, on that form, writing nothing", async () => {
    const testroot = await compendiumEntry('Testroot');
    const linking = (substituteVariantId?: string) =>
      withForms({ substitutes: [{ ingredientId: testroot.id, substituteVariantId }] });
    const path = ['variants', 0, 'substitutes', 0, 'substituteVariantId'];
    // Why each could have saved: the same link, its form named, does.
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      linking(testroot.form),
    );
    const leaf = await variantIdOf(sql, created.id, 'Testleaf');
    const count = await countIngredients();

    const create = createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...linking(),
      name: 'Testwort, formless',
    });
    await expect(create).rejects.toThrow(ValidationError);
    await expect(create).rejects.toMatchObject({ issues: [{ path }] });
    const update = updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, {
      ...linking(),
      variants: [{ ...linking().variants[0], id: leaf }],
    });
    await expect(update).rejects.toThrow(ValidationError);
    await expect(update).rejects.toMatchObject({ issues: [{ path }] });

    expect(await countIngredients()).toBe(count);
    expect(
      await sql`
        select substitute_variant_id from ingredient_substitutes
        where variant_id = ${leaf} and deleted_at is null`,
    ).toEqual([{ substitute_variant_id: testroot.form }]);
  });

  // MB.217's narrowed `not_itself`: the same ingredient and the same form.
  it('lets a form name a sibling form as its substitute, refusing the form itself on that entry', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms({ form: 'Testleaf' }, { form: 'Testoil' }),
    );
    const [leaf, oil] = await variantRowsOf(sql, created.id);
    const naming = (form: string) =>
      withForms(
        { id: leaf.id, form: 'Testleaf' },
        {
          id: oil.id,
          form: 'Testoil',
          substitutes: [{ ingredientId: created.id, substituteVariantId: form }],
        },
      );

    const attempt = updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      naming(oil.id),
    );
    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      issues: [{ path: ['variants', 1, 'substitutes', 0] }],
    });

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, naming(leaf.id));
    expect((await variantChildrenOf(sql, oil.id)).substitutes).toMatchObject([
      { substitute_id: created.id, substitute_variant_id: leaf.id },
    ]);
  });

  it('keeps a substitute link that names another form of what it links, in place', async () => {
    const testroot = await compendiumEntry('Testroot');
    const rootOil = await insertVariant(sql, testroot.id, { form: 'Testoil' }, A.id);
    const naming = (form: string) =>
      withForms({ substitutes: [{ ingredientId: testroot.id, substituteVariantId: form }] });
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      naming(testroot.form),
    );
    const leaf = await variantIdOf(sql, created.id, 'Testleaf');
    const [before] = await sql`
      select id from ingredient_substitutes where variant_id = ${leaf}`;

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, {
      ...naming(rootOil),
      variants: [{ ...naming(rootOil).variants[0], id: leaf }],
    });

    expect(
      await sql`
        select id, substitute_variant_id from ingredient_substitutes
        where variant_id = ${leaf} and deleted_at is null`,
    ).toEqual([{ id: before.id, substitute_variant_id: rootOil }]);
  });

  it('refuses a form another of its live forms still holds, on that entry, rather than the raw index error', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms({ form: 'Testleaf' }, { form: 'Testoil' }),
    );
    const [leaf, oil] = await variantRowsOf(sql, created.id);

    // Each kept row is rewritten in turn, so the first takes a form the second still holds.
    const attempt = updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      withForms({ id: leaf.id, form: 'Testoil' }, { id: oil.id, form: 'Testleaf' }),
    );

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({ issues: [{ path: ['variants', 0, 'form'] }] });
    expect(await liveFormsOf(sql, created.id)).toEqual(['Testleaf', 'Testoil']);
  });

  // A form's pair carries its ingredient too (MB.217), so a drop from the
  // ingredient's own list names the ingredient's pairs alone.
  it("drops a category from the ingredient's own list, leaving a form filed under it", async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...withForms({ form: 'Testleaf', categoryIds: [protection] }),
      categoryIds: [protection],
    });
    const leaf = await variantIdOf(sql, created.id, 'Testleaf');
    // Why the drop could reach it: both pairs name the ingredient and the category.
    expect(
      await sql`select variant_id from ingredient_categories
        where ingredient_id = ${created.id} and category_id = ${protection}`,
    ).toHaveLength(2);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, {
      ...withForms({ id: leaf, form: 'Testleaf', categoryIds: [protection] }),
      categoryIds: [],
    });

    expect(
      await sql`select variant_id from ingredient_categories where ingredient_id = ${created.id}`,
    ).toEqual([{ variant_id: leaf }]);
  });

  it('writes no form and none of its children on a save that changes nothing', async () => {
    // The coven's own source, which a form's links are read back beside (MB.218).
    const source = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);
    const input = (ids: string[] = []) =>
      withForms(
        {
          id: ids[0],
          form: 'Testleaf',
          celestialBodies: ['Venus'],
          categoryIds: [protection],
          substitutes: [{ name: 'Mock Root' }],
          references: [{ referenceId: source, locator: 'p. 3' }],
        },
        { id: ids[1], form: 'Testoil' },
      );
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input());
    const rows = await variantRowsOf(sql, created.id);
    const written = async () =>
      Promise.all(
        rows.map(async (row) => ({
          row: (await variantRowsOf(sql, created.id)).find((other) => other.id === row.id)?.xmin,
          children: await variantChildrenOf(sql, row.id),
        })),
      );
    const before = await written();

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      input(rows.map((row) => row.id as string)),
    );

    // Why the comparison could fail: the ingredient row itself was rewritten.
    expect(await writtenBy(created.id)).not.toBe(before[0].row);
    expect(await written()).toEqual(before);
  });
});
