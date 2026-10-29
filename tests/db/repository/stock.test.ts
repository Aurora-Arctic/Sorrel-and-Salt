import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findStockByIds, findStockOfIngredients, findStockOfVariants } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { A, D, E, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient, insertVariant } from '../../support/db/insert-ingredient';
import { insertStock } from '../../support/db/insert-stock';
import { variantIdOf } from '../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../support/fixtures';

// The batch read the `Ingredient.stock` loader calls: a coven's live jars of a set of ingredients,
// under the coven's proof. The service's own tests read one jar at a time; this is the many-ingredient
// shape, with the rows it must leave out seeded beside the rows it must keep.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

describe('findStockOfIngredients', () => {
  it("reads the coven's live jars of live forms of live ingredients, and nothing else", async () => {
    const herb = await insertIngredient(sql, makeIngredient(), E.id);
    const herbForm = await variantIdOf(sql, herb, 'Testform');
    const otherForm = await insertVariant(sql, herb, makeVariant({ form: 'Powder' }), E.id);
    const goneForm = await insertVariant(sql, herb, makeVariant({ form: 'Gone' }), E.id);
    const gone = await insertIngredient(
      sql,
      makeIngredient({ name: 'Gonewort', nomenclature: 'none' }),
      E.id,
    );
    const goneIngredientForm = await variantIdOf(sql, gone, 'Testform');
    const jar = (workspaceId: string, ingredientId: string, variantId: string, deleted = false) =>
      insertStock(sql, { workspaceId, ingredientId, variantId, deleted }, A.id);

    const kept = [
      await jar(WORKSPACE_W_ID, herb, herbForm),
      await jar(WORKSPACE_W_ID, herb, otherForm),
    ];
    await jar(WORKSPACE_W_ID, herb, herbForm, true);
    await jar(WORKSPACE_X_ID, herb, herbForm);
    await jar(WORKSPACE_W_ID, herb, goneForm);
    await jar(WORKSPACE_W_ID, gone, goneIngredientForm);
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${E.id} where id = ${goneForm}`;
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['read'] });
    const rows = await findStockOfIngredients(w, [herb, gone]);

    expect(rows.map((row) => row.id).sort()).toEqual([...kept].sort());
    // X's jar of the same form is there, under X's proof.
    const x = await assertMembership(asUser(D), WORKSPACE_X_ID, { inventory: ['read'] });
    expect(await findStockOfIngredients(x, [herb])).toHaveLength(1);
  });

  it('reads nothing for no ingredients', async () => {
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['read'] });
    await expect(findStockOfIngredients(w, [])).resolves.toEqual([]);
  });
});

describe('findStockByIds', () => {
  it("reads the coven's live jars with these ids, and no other", async () => {
    const herb = await insertIngredient(sql, makeIngredient(), E.id);
    const herbForm = await variantIdOf(sql, herb, 'Testform');
    const otherForm = await insertVariant(sql, herb, makeVariant({ form: 'Powder' }), E.id);
    const jar = (workspaceId: string, variantId: string, deleted = false) =>
      insertStock(sql, { workspaceId, ingredientId: herb, variantId, deleted }, A.id);

    const first = await jar(WORKSPACE_W_ID, herbForm);
    const second = await jar(WORKSPACE_W_ID, otherForm);
    const unasked = await jar(WORKSPACE_W_ID, otherForm, true);
    const deleted = await jar(WORKSPACE_W_ID, herbForm, true);
    const elsewhere = await jar(WORKSPACE_X_ID, herbForm);

    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['read'] });
    const rows = await findStockByIds(w, [first, second, deleted, elsewhere]);

    // The soft-deleted jar and X's jar were asked for by id and are not there.
    expect(rows.map((row) => row.id).sort()).toEqual([first, second].sort());
    expect(rows.map((row) => row.id)).not.toContain(unasked);
  });

  it('reads nothing for no ids', async () => {
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['read'] });
    await expect(findStockByIds(w, [])).resolves.toEqual([]);
  });
});

describe('findStockOfVariants', () => {
  it("reads the coven's live jars of these forms, and no other coven's or form's", async () => {
    const herb = await insertIngredient(sql, makeIngredient(), E.id);
    const herbForm = await variantIdOf(sql, herb, 'Testform');
    const otherForm = await insertVariant(sql, herb, makeVariant({ form: 'Powder' }), E.id);
    const unaskedForm = await insertVariant(sql, herb, makeVariant({ form: 'Oil' }), E.id);
    const jar = (workspaceId: string, variantId: string, deleted = false) =>
      insertStock(sql, { workspaceId, ingredientId: herb, variantId, deleted }, A.id);

    const live = await jar(WORKSPACE_W_ID, herbForm);
    await jar(WORKSPACE_W_ID, otherForm, true);
    await jar(WORKSPACE_W_ID, unaskedForm);
    const elsewhere = await jar(WORKSPACE_X_ID, otherForm);

    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['read'] });
    const rows = await findStockOfVariants(w, [herbForm, otherForm]);

    // W's jar of the second form is soft-deleted, and X's of it is X's.
    expect(rows.map((row) => row.id)).toEqual([live]);
    // Why X's jar could have come back: it is there, under X's proof.
    const x = await assertMembership(asUser(D), WORKSPACE_X_ID, { inventory: ['read'] });
    expect((await findStockOfVariants(x, [otherForm])).map((row) => row.id)).toEqual([elsewhere]);
  });

  it('reads nothing for no forms', async () => {
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['read'] });
    await expect(findStockOfVariants(w, [])).resolves.toEqual([]);
  });
});
