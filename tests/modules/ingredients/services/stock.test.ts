import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import {
  type StockValues,
  createStock,
  deleteStock,
  getStock,
  updateStock,
} from '@/modules/ingredients';
import type { Unit } from '@/modules/ingredients/schema/units';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient, insertVariant } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// Story 12's stock half (M9.3): members and owners write a coven's stock,
// viewers read it, and nobody outside the coven reaches it — the site admin
// included. The ingredient tables are emptied per test, and the cascade
// empties `inventory_items` with them, so every jar a result could come from
// is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** A compendium entry's one form, W's own entry's, and X's own entry's. */
let compendiumForm: string;
let compendiumIngredient: string;
let ownForm: string;
let ownIngredient: string;
let otherCovenForm: string;
let otherCovenIngredient: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  compendiumIngredient = await insertIngredient(sql, makeIngredient(), E.id);
  compendiumForm = await variantIdOf(sql, compendiumIngredient, 'Testform');
  ownIngredient = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', name: 'Covenwort' }),
    A.id,
  );
  ownForm = await variantIdOf(sql, ownIngredient, 'Testform');
  otherCovenIngredient = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: WORKSPACE_X_ID, nomenclature: 'none', name: 'Elsewort' }),
    D.id,
  );
  otherCovenForm = await variantIdOf(sql, otherCovenIngredient, 'Testform');
});

/** A jar of the compendium form in W, written raw by A. */
function seedJar(overrides: Partial<Parameters<typeof insertStock>[1]> = {}) {
  return insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: compendiumIngredient,
      variantId: compendiumForm,
      quantityOnHand: '5',
      unit: 'g',
      lowStockThreshold: '10',
      ...overrides,
    },
    A.id,
  );
}

/** Every row of `inventory_items`, tombstones included, oldest first. */
function jars() {
  return sql`
    select id, workspace_id, variant_id, quantity_on_hand, unit, unit_dimension,
      low_stock_threshold, source, created_by, updated_by, deleted_at, deleted_by,
      xmin::text as xmin
    from inventory_items order by created_at, id`;
}

/** An input as a caller might send it, a field the schema does not hold included. */
function withDimension(input: StockValues, unitDimension: string): StockValues {
  return { ...input, unitDimension } as StockValues;
}

describe('createStock', () => {
  it.each([
    ['A, the owner', A],
    ['B, a member', B],
  ])('lets %s stock a form in their coven, stamped as the writer', async (_label, user) => {
    const row = await createStock(asUser(user), WORKSPACE_W_ID, compendiumForm, {
      quantityOnHand: 12,
      unit: 'g',
    });

    expect(row).toMatchObject({
      workspaceId: WORKSPACE_W_ID,
      ingredientId: compendiumIngredient,
      variantId: compendiumForm,
    });
    const [jar] = await jars();
    expect(jar).toMatchObject({ id: row.id, created_by: user.id, deleted_at: null });
    expect(Number(jar.quantity_on_hand)).toBe(12);
  });

  it("stocks a form of the coven's own entry", async () => {
    const row = await createStock(asUser(A), WORKSPACE_W_ID, ownForm, {});
    expect(row).toMatchObject({ ingredientId: ownIngredient, variantId: ownForm });
  });

  it('derives the dimension from the unit and takes none from the input', async () => {
    const row = await createStock(
      asUser(A),
      WORKSPACE_W_ID,
      compendiumForm,
      withDimension({ unit: 'g' }, 'volume'),
    );

    expect(row.unitDimension).toBe('weight');
    const [jar] = await jars();
    expect(jar.unit_dimension).toBe('weight');
  });

  it('leaves a row with no unit without a dimension or a threshold', async () => {
    const row = await createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, { quantityOnHand: 2 });
    expect(row).toMatchObject({ unit: null, unitDimension: null, lowStockThreshold: null });
  });

  // 3 for count, 10 g for weight and 15 ml for volume, in the row's own unit.
  it.each<[Unit, number]>([
    ['piece', 3],
    ['drop', 3],
    ['g', 10],
    ['kg', 0.01],
    ['mg', 10000],
    ['oz', 0.353],
    ['ml', 15],
    ['l', 0.015],
    ['tsp', 3],
  ])('writes the default threshold for a row in %s', async (unit, threshold) => {
    const row = await createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, { unit });
    expect(Number(row.lowStockThreshold)).toBe(threshold);
  });

  it('keeps a threshold the input states, zero included', async () => {
    const row = await createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, {
      unit: 'g',
      lowStockThreshold: 0,
    });
    expect(Number(row.lowStockThreshold)).toBe(0);
  });

  it('refuses a form the coven already holds, beside the form, and writes nothing', async () => {
    await seedJar();
    const [before] = await jars();

    const refusal = await createStock(asUser(B), WORKSPACE_W_ID, compendiumForm, {
      quantityOnHand: 10,
      unit: 'g',
    }).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([['variantId']]);
    expect(await jars()).toEqual([before]);
  });

  it('inserts a fresh jar once the last one was deleted', async () => {
    const deleted = await seedJar({ deleted: true });

    const row = await createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, { quantityOnHand: 1 });

    expect(row.id).not.toBe(deleted);
    const rows = await jars();
    expect(rows.map((jar) => [jar.id, jar.deleted_at === null])).toEqual([
      [deleted, false],
      [row.id, true],
    ]);
  });

  it('refuses a viewer, who may still read the coven’s stock', async () => {
    const id = await seedJar();
    await expect(getStock(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({ id });

    await expect(createStock(asUser(C), WORKSPACE_W_ID, ownForm, {})).rejects.toThrow(Forbidden);
    expect(await jars()).toHaveLength(1);
  });

  it('refuses D in W, and refuses W’s own entry’s form under X', async () => {
    // D may stock X's own forms in X.
    await expect(createStock(asUser(D), WORKSPACE_X_ID, otherCovenForm, {})).resolves.toBeDefined();

    await expect(createStock(asUser(D), WORKSPACE_W_ID, compendiumForm, {})).rejects.toThrow(
      Forbidden,
    );
    await expect(createStock(asUser(D), WORKSPACE_X_ID, ownForm, {})).rejects.toThrow(NotFound);
    expect((await jars()).map((jar) => jar.workspace_id)).toEqual([WORKSPACE_X_ID]);
  });

  it('refuses another coven’s form by direct id', async () => {
    // The form is real and stockable — by the coven that owns it.
    await expect(createStock(asUser(D), WORKSPACE_X_ID, otherCovenForm, {})).resolves.toBeDefined();

    await expect(createStock(asUser(A), WORKSPACE_W_ID, otherCovenForm, {})).rejects.toThrow(
      NotFound,
    );
    expect((await jars()).map((jar) => jar.workspace_id)).toEqual([WORKSPACE_X_ID]);
  });

  it('refuses a form of a deleted ingredient, a deleted form, and an id that is not one', async () => {
    const goneForm = await insertVariant(sql, ownIngredient, makeVariant({ form: 'Gone' }), A.id);
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${goneForm}`;
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${compendiumIngredient}`;

    for (const variantId of [compendiumForm, goneForm, 'not-a-uuid']) {
      await expect(createStock(asUser(A), WORKSPACE_W_ID, variantId, {})).rejects.toThrow(NotFound);
    }
    expect(await jars()).toHaveLength(0);
  });

  it('refuses the site admin, who belongs to no coven', async () => {
    await expect(createStock(asUser(E), WORKSPACE_W_ID, compendiumForm, {})).rejects.toThrow(
      Forbidden,
    );
    expect(await jars()).toHaveLength(0);
  });

  it('refuses an input the stock schema rejects', async () => {
    await expect(
      createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, { quantityOnHand: -1 }),
    ).rejects.toThrow(ValidationError);
    expect(await jars()).toHaveLength(0);
  });
});

describe('updateStock', () => {
  it.each([
    ['A, the owner', A],
    ['B, a member', B],
  ])('lets %s change a jar, keeping what the input leaves out', async (_label, user) => {
    const id = await seedJar({ lowStockThreshold: '4' });

    const row = await updateStock(asUser(user), WORKSPACE_W_ID, id, { quantityOnHand: 7 });

    expect(row.id).toBe(id);
    const [jar] = await jars();
    expect(jar).toMatchObject({ updated_by: user.id, unit: 'g', unit_dimension: 'weight' });
    expect(Number(jar.quantity_on_hand)).toBe(7);
    expect(Number(jar.low_stock_threshold)).toBe(4);
  });

  it('clears a field the input sets to null', async () => {
    const id = await seedJar();
    await updateStock(asUser(A), WORKSPACE_W_ID, id, { quantityOnHand: null });
    const [jar] = await jars();
    expect(jar.quantity_on_hand).toBeNull();
  });

  it('derives the dimension from a new unit and takes none from the input', async () => {
    const id = await seedJar();

    await updateStock(asUser(A), WORKSPACE_W_ID, id, withDimension({ unit: 'ml' }, 'weight'));
    expect((await jars())[0]).toMatchObject({ unit: 'ml', unit_dimension: 'volume' });

    await updateStock(asUser(A), WORKSPACE_W_ID, id, { unit: null });
    expect((await jars())[0]).toMatchObject({ unit: null, unit_dimension: null });
  });

  it('refuses a viewer, who may still read the jar', async () => {
    const id = await seedJar();
    await expect(getStock(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({ id });
    const [before] = await jars();

    await expect(updateStock(asUser(C), WORKSPACE_W_ID, id, { quantityOnHand: 0 })).rejects.toThrow(
      Forbidden,
    );
    expect(await jars()).toEqual([before]);
  });

  it('refuses D a jar of W by direct id, under either coven', async () => {
    const id = await seedJar();
    // D writes X's stock, so the refusal below is the jar's coven, not D's role.
    const theirs = await createStock(asUser(D), WORKSPACE_X_ID, otherCovenForm, {});
    await expect(
      updateStock(asUser(D), WORKSPACE_X_ID, theirs.id, { quantityOnHand: 1 }),
    ).resolves.toBeDefined();
    const [before] = await jars();

    await expect(updateStock(asUser(D), WORKSPACE_W_ID, id, { quantityOnHand: 0 })).rejects.toThrow(
      Forbidden,
    );
    await expect(updateStock(asUser(D), WORKSPACE_X_ID, id, { quantityOnHand: 0 })).rejects.toThrow(
      NotFound,
    );
    expect((await jars())[0]).toEqual(before);
  });

  it('refuses the site admin', async () => {
    const id = await seedJar();
    await expect(updateStock(asUser(E), WORKSPACE_W_ID, id, { quantityOnHand: 0 })).rejects.toThrow(
      Forbidden,
    );
  });

  it('finds no jar of a deleted ingredient, a deleted jar, or an id that is not one', async () => {
    const orphaned = await seedJar();
    const deleted = await seedJar({
      ingredientId: ownIngredient,
      variantId: ownForm,
      deleted: true,
    });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${compendiumIngredient}`;

    for (const id of [orphaned, deleted, 'not-a-uuid']) {
      await expect(
        updateStock(asUser(A), WORKSPACE_W_ID, id, { quantityOnHand: 0 }),
      ).rejects.toThrow(NotFound);
    }
    expect((await jars()).map((jar) => Number(jar.quantity_on_hand))).toEqual([5, 5]);
  });
});

describe('deleteStock', () => {
  it.each([
    ['A, the owner', A],
    ['B, a member', B],
  ])('lets %s soft-delete a jar, which no read then finds', async (_label, user) => {
    const id = await seedJar();

    await deleteStock(asUser(user), WORKSPACE_W_ID, id);

    const [jar] = await jars();
    expect(jar.deleted_at).not.toBeNull();
    expect(jar.deleted_by).toBe(user.id);
    await expect(getStock(asUser(A), WORKSPACE_W_ID, id)).rejects.toThrow(NotFound);
  });

  it('refuses a viewer, who may still read the jar', async () => {
    const id = await seedJar();
    await expect(getStock(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({ id });

    await expect(deleteStock(asUser(C), WORKSPACE_W_ID, id)).rejects.toThrow(Forbidden);
    expect((await jars())[0].deleted_at).toBeNull();
  });

  it('refuses D a jar of W by direct id, under either coven', async () => {
    const id = await seedJar();
    const theirs = await createStock(asUser(D), WORKSPACE_X_ID, otherCovenForm, {});
    await expect(deleteStock(asUser(D), WORKSPACE_X_ID, theirs.id)).resolves.toBeUndefined();

    await expect(deleteStock(asUser(D), WORKSPACE_W_ID, id)).rejects.toThrow(Forbidden);
    await expect(deleteStock(asUser(D), WORKSPACE_X_ID, id)).rejects.toThrow(NotFound);
    expect((await jars()).find((jar) => jar.id === id)?.deleted_at).toBeNull();
  });

  it('refuses the site admin', async () => {
    const id = await seedJar();
    await expect(deleteStock(asUser(E), WORKSPACE_W_ID, id)).rejects.toThrow(Forbidden);
    expect((await jars())[0].deleted_at).toBeNull();
  });

  it('finds no jar of a deleted ingredient, a deleted jar, or an id that is not one', async () => {
    const orphaned = await seedJar();
    const deleted = await seedJar({
      ingredientId: ownIngredient,
      variantId: ownForm,
      deleted: true,
    });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${compendiumIngredient}`;

    for (const id of [orphaned, deleted, 'not-a-uuid']) {
      await expect(deleteStock(asUser(A), WORKSPACE_W_ID, id)).rejects.toThrow(NotFound);
    }
    expect((await jars()).find((jar) => jar.id === orphaned)?.deleted_at).toBeNull();
  });
});

describe('getStock', () => {
  it.each([
    ['A, the owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
  ])('lets %s read a jar of their coven', async (_label, user) => {
    const id = await seedJar();
    await expect(getStock(asUser(user), WORKSPACE_W_ID, id)).resolves.toMatchObject({
      id,
      workspaceId: WORKSPACE_W_ID,
      variantId: compendiumForm,
    });
  });

  it('refuses D a jar of W by direct id, under either coven', async () => {
    const id = await seedJar();
    const theirs = await createStock(asUser(D), WORKSPACE_X_ID, otherCovenForm, {});
    await expect(getStock(asUser(D), WORKSPACE_X_ID, theirs.id)).resolves.toMatchObject({
      id: theirs.id,
    });

    await expect(getStock(asUser(D), WORKSPACE_W_ID, id)).rejects.toThrow(Forbidden);
    await expect(getStock(asUser(D), WORKSPACE_X_ID, id)).rejects.toThrow(NotFound);
  });

  it('refuses the site admin', async () => {
    const id = await seedJar();
    await expect(getStock(asUser(E), WORKSPACE_W_ID, id)).rejects.toThrow(Forbidden);
  });

  it('reads no jar of a deleted ingredient or a deleted form, though the jar stays', async () => {
    const ofIngredient = await seedJar();
    const formId = await insertVariant(sql, ownIngredient, makeVariant({ form: 'Gone' }), A.id);
    const ofForm = await seedJar({ ingredientId: ownIngredient, variantId: formId });
    // Both readable before the deletes, so the refusals below are the deletes'.
    await expect(getStock(asUser(A), WORKSPACE_W_ID, ofIngredient)).resolves.toBeDefined();
    await expect(getStock(asUser(A), WORKSPACE_W_ID, ofForm)).resolves.toBeDefined();

    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${compendiumIngredient}`;
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${formId}`;

    await expect(getStock(asUser(A), WORKSPACE_W_ID, ofIngredient)).rejects.toThrow(NotFound);
    await expect(getStock(asUser(A), WORKSPACE_W_ID, ofForm)).rejects.toThrow(NotFound);
    expect((await jars()).every((jar) => jar.deleted_at === null)).toBe(true);
  });

  it('finds no id that is not one', async () => {
    await expect(getStock(asUser(A), WORKSPACE_W_ID, 'not-a-uuid')).rejects.toThrow(NotFound);
  });
});
