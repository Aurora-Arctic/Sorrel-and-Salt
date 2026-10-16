import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findStockOfIngredients } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { A, D, E, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient, insertVariant } from '../../support/db/insert-ingredient';
import { insertStock } from '../../support/db/insert-stock';
import { variantIdOf } from '../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../support/fixtures';

// The batch read M9.4's `Ingredient.stock` loader calls: a coven's live jars
// of a set of ingredients, under the coven's proof. The service's own tests
// read one jar at a time; this is the many-ingredient shape, with the rows it
// must leave out seeded beside the rows it must keep.

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
