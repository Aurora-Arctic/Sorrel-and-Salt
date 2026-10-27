import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { COVEN_STOCK_LOCK_NAMESPACE } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import {
  type SaveStockValues,
  type StockValues,
  createStock,
  deleteStock,
  getStock,
  saveStock,
  stockOf,
  updateStock,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
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
  it('lets B, a member, stock a form in their coven, stamped as the writer', async () => {
    const user = B;
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

  // validation/default-threshold.test.ts proves the value unit by unit; this
  // proves the new row stores it, rounded to the column's three places.
  it('writes the default threshold for a row in its own unit', async () => {
    const row = await createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, { unit: 'oz' });
    expect(Number(row.lowStockThreshold)).toBe(0.353);
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
  it('lets B, a member, change a jar, keeping what the input leaves out', async () => {
    const user = B;
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

  describe('the default threshold', () => {
    // A jar saved with a quantity and no unit holds no threshold either; the
    // unit it later gets brings the dimension's default, as a new jar's does.
    it('writes the default threshold for the first unit a jar gets', async () => {
      const id = await seedJar({ unit: null, lowStockThreshold: null });

      await updateStock(asUser(B), WORKSPACE_W_ID, id, { unit: 'kg' });

      const [jar] = await jars();
      expect(jar.unit).toBe('kg');
      expect(Number(jar.low_stock_threshold)).toBeCloseTo(0.01, 6);
    });

    it('leaves a threshold the jar already holds alone, as it leaves one the input states', async () => {
      const held = await seedJar({ unit: null, lowStockThreshold: '4' });
      await updateStock(asUser(A), WORKSPACE_W_ID, held, { unit: 'g' });
      expect(Number((await jars())[0].low_stock_threshold)).toBe(4);

      const stated = await seedJar({
        ingredientId: ownIngredient,
        variantId: ownForm,
        unit: null,
        lowStockThreshold: null,
      });
      await updateStock(asUser(A), WORKSPACE_W_ID, stated, { unit: 'g', lowStockThreshold: 0 });
      const rows = await jars();
      expect(Number(rows.find((row) => row.id === stated)?.low_stock_threshold)).toBe(0);
    });

    it('writes none for a jar that already had a unit, or when the update sets none', async () => {
      const united = await seedJar({ unit: 'g', lowStockThreshold: null });
      await updateStock(asUser(A), WORKSPACE_W_ID, united, { unit: 'kg' });
      await updateStock(asUser(A), WORKSPACE_W_ID, united, { quantityOnHand: 2 });
      expect((await jars())[0].low_stock_threshold).toBeNull();

      const bare = await seedJar({
        ingredientId: ownIngredient,
        variantId: ownForm,
        unit: null,
        lowStockThreshold: null,
      });
      await updateStock(asUser(A), WORKSPACE_W_ID, bare, { quantityOnHand: 2 });
      await updateStock(asUser(A), WORKSPACE_W_ID, bare, { unit: null });
      const rows = await jars();
      expect(rows.find((row) => row.id === bare)?.low_stock_threshold).toBeNull();
    });
  });

  it('refuses a viewer, who may still read the jar', async () => {
    const id = await seedJar();
    await expect(getStock(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({ id });
    const [before] = await jars();

    await expect(updateStock(asUser(C), WORKSPACE_W_ID, id, { quantityOnHand: 0 })).rejects.toThrow(
      Forbidden,
    );
    expect(await jars()).toEqual([before]);
    // The same call by a member succeeds, so the refusal is the role.
    await expect(
      updateStock(asUser(B), WORKSPACE_W_ID, id, { quantityOnHand: 0 }),
    ).resolves.toMatchObject({ id });
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
    // The jar is live and a member of W writes it by the same id.
    await expect(
      updateStock(asUser(B), WORKSPACE_W_ID, id, { quantityOnHand: 0 }),
    ).resolves.toMatchObject({ id });
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
  it('lets B, a member, soft-delete a jar, which no read then finds', async () => {
    const user = B;
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
  it('lets C, a viewer, read a jar of their coven', async () => {
    const user = C;
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

describe('stockOf', () => {
  it("answers each ingredient with the coven's live jars of it, one per form", async () => {
    const oilForm = await insertVariant(sql, ownIngredient, makeVariant({ form: 'Oil' }), A.id);
    const ofCompendium = await seedJar();
    const ofOwn = await seedJar({ ingredientId: ownIngredient, variantId: ownForm });
    const ofOil = await seedJar({ ingredientId: ownIngredient, variantId: oilForm });
    // A thrown-out jar, and X's jar of the same compendium form, are in no answer.
    await seedJar({ ingredientId: ownIngredient, variantId: oilForm, deleted: true });
    await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_X_ID,
        ingredientId: compendiumIngredient,
        variantId: compendiumForm,
      },
      D.id,
    );
    const unstocked = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', name: 'Barewort' }),
      A.id,
    );

    const answers = await stockOf(asUser(C), [
      { ingredientId: compendiumIngredient, workspaceId: WORKSPACE_W_ID },
      { ingredientId: ownIngredient, workspaceId: WORKSPACE_W_ID },
      { ingredientId: unstocked, workspaceId: WORKSPACE_W_ID },
    ]);

    const ids = answers.map((answer) =>
      answer instanceof Error ? answer : answer.map((jar) => jar.id).sort(),
    );
    expect(ids).toEqual([[ofCompendium], [ofOwn, ofOil].sort(), []]);
  });

  it('answers Forbidden for a coven the caller is not in, and the rest of the batch still', async () => {
    const id = await seedJar();
    const theirs = await createStock(asUser(D), WORKSPACE_X_ID, otherCovenForm, {});

    const [inW, inX] = await stockOf(asUser(D), [
      { ingredientId: compendiumIngredient, workspaceId: WORKSPACE_W_ID },
      { ingredientId: otherCovenIngredient, workspaceId: WORKSPACE_X_ID },
    ]);

    // Why W's could have answered: the jar is there, and B reads it.
    const [asB] = await stockOf(asUser(B), [
      { ingredientId: compendiumIngredient, workspaceId: WORKSPACE_W_ID },
    ]);
    expect(asB).toMatchObject([{ id }]);
    expect(inW).toBeInstanceOf(Forbidden);
    expect(inX).toMatchObject([{ id: theirs.id }]);
  });

  it('answers the site admin Forbidden', async () => {
    await seedJar();
    const [answer] = await stockOf(asUser(E), [
      { ingredientId: compendiumIngredient, workspaceId: WORKSPACE_W_ID },
    ]);
    expect(answer).toBeInstanceOf(Forbidden);
  });
});

// createStock takes the coven's stock lock, which the cupboard's writes that
// count or move jars queue on too (M12.15, M12.21, M12.23).
describe("a coven's stock lock", () => {
  const WAIT_MS = 200;

  /**
   * Holds `workspaceId`'s lock in an open transaction while `during` runs, and
   * releases it after, even when `during` throws.
   */
  async function holding(workspaceId: string, during: () => Promise<void>) {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let acquired!: () => void;
    const held = new Promise<void>((resolve) => (acquired = resolve));
    const transaction = sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${COVEN_STOCK_LOCK_NAMESPACE}, hashtext(${workspaceId}))`;
      acquired();
      await released;
    });
    try {
      await held;
      await during();
    } finally {
      release();
      await transaction;
    }
  }

  /**
   * Starts `call` while `lockedId`'s lock is held, asserts it has not settled
   * and `untouched` still holds after the wait, then releases the lock and
   * returns what the call came to.
   */
  async function queued<T>(
    lockedId: string,
    call: () => Promise<T>,
    untouched: () => Promise<void>,
  ): Promise<T> {
    let running!: Promise<T>;
    await holding(lockedId, async () => {
      let settled = false;
      running = call();
      running.then(
        () => (settled = true),
        () => (settled = true),
      );
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      expect(settled).toBe(false);
      await untouched();
    });
    return running;
  }

  const jarCount = async () =>
    (await sql`select count(*)::int as n from inventory_items`)[0].n as number;

  it('holds a new jar back until the lock is released', async () => {
    const jar = await queued(
      WORKSPACE_W_ID,
      () =>
        createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, { quantityOnHand: 5, unit: 'g' }),
      async () => {
        expect(await jarCount()).toBe(0);
      },
    );
    expect(jar.variantId).toBe(compendiumForm);
  });

  it("is per coven: another coven's lock does not hold a new jar back", async () => {
    await holding(WORKSPACE_X_ID, async () => {
      const jar = await createStock(asUser(A), WORKSPACE_W_ID, compendiumForm, {
        quantityOnHand: 5,
        unit: 'g',
      });
      expect(jar.variantId).toBe(compendiumForm);
    });
  });
});

// M9.9's batch: the dialog's one Save, a list of creates, updates and deletes
// of one ingredient's jars in one transaction. Compendium entries are in the
// cupboard only once stocked, so the cupboard rows are read raw below.
describe('saveStock', () => {
  const none: SaveStockValues = { create: [], update: [], delete: [] };
  let powderForm: string;
  let oilForm: string;

  beforeEach(async () => {
    powderForm = await insertVariant(
      sql,
      compendiumIngredient,
      makeVariant({ form: 'Powder' }),
      E.id,
    );
    oilForm = await insertVariant(sql, compendiumIngredient, makeVariant({ form: 'Oil' }), E.id);
  });

  const cupboardRows = () =>
    sql`select ingredient_id from workspace_compendium_entries where deleted_at is null`;
  const live = () => sql`select id from inventory_items where deleted_at is null order by id`;
  const save = (user: Parameters<typeof asUser>[0], batch: Partial<SaveStockValues>) =>
    saveStock(asUser(user), WORKSPACE_W_ID, compendiumIngredient, { ...none, ...batch });

  it('creates, updates and deletes in one call and answers the ingredient’s live jars', async () => {
    const kept = await seedJar();
    const edited = await seedJar({ variantId: powderForm, quantityOnHand: '2', unit: 'g' });
    const removed = await seedJar({ variantId: oilForm });
    const teaForm = await insertVariant(
      sql,
      compendiumIngredient,
      makeVariant({ form: 'Tea' }),
      E.id,
    );

    const result = await save(B, {
      create: [{ variantId: teaForm, input: { quantityOnHand: 7, unit: 'g' } }],
      update: [{ id: edited, input: { quantityOnHand: 9 } }],
      delete: [removed],
    });

    expect(result.map((jar) => jar.variantId).sort()).toEqual(
      [compendiumForm, powderForm, teaForm].sort(),
    );
    expect(result.map((jar) => jar.id)).toEqual(expect.arrayContaining([kept, edited]));
    expect(result.map((jar) => jar.id)).not.toContain(removed);
    const rows = await jars();
    expect(rows.find((jar) => jar.id === removed)).toMatchObject({
      deleted_by: B.id,
    });
    expect(Number(rows.find((jar) => jar.id === edited)?.quantity_on_hand)).toBe(9);
    expect(rows.find((jar) => jar.id === edited)).toMatchObject({ updated_by: B.id });
    expect(rows.find((jar) => jar.id === kept)).toMatchObject({ updated_by: A.id });
  });

  it('creates new jars beside the held one, stamped as the writer', async () => {
    const held = await seedJar();

    const result = await save(B, {
      create: [
        { variantId: powderForm, input: { quantityOnHand: 7, unit: 'g' } },
        { variantId: oilForm, input: { quantityOnHand: 1, unit: 'ml' } },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result.map((jar) => jar.variantId).sort()).toEqual(
      [compendiumForm, powderForm, oilForm].sort(),
    );
    const created = (await jars()).filter((jar) => jar.id !== held);
    expect(created.map((jar) => jar.created_by)).toEqual([B.id, B.id]);
    expect(created.map((jar) => jar.unit_dimension).sort()).toEqual(['volume', 'weight']);
  });

  it.each([
    ['C, a viewer', C],
    ['D, in an unrelated coven', D],
    ['E, the site admin', E],
  ])('refuses %s every part of the batch, by direct id', async (_label, user) => {
    // The jar and form are real, live and in W, and a member's same call works.
    const id = await seedJar({ variantId: powderForm });
    const removed = await seedJar({ variantId: oilForm });
    const [before] = await jars();
    const batch = {
      create: [{ variantId: compendiumForm, input: { quantityOnHand: 1 } }],
      update: [{ id, input: { quantityOnHand: 99 } }],
      delete: [removed],
    };

    await expect(save(user, batch)).rejects.toThrow(Forbidden);
    expect((await jars())[0]).toEqual(before);
    expect(await live()).toHaveLength(2);

    await expect(save(B, batch)).resolves.toHaveLength(2);
  });

  it('writes nothing when one id is out of scope', async () => {
    const own = await seedJar();
    const otherCoven = await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_X_ID,
        ingredientId: compendiumIngredient,
        variantId: compendiumForm,
      },
      D.id,
    );
    const otherIngredientJar = await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: ownIngredient, variantId: ownForm },
      A.id,
    );
    const goneJar = await seedJar({ variantId: powderForm, deleted: true });
    const before = await jars();

    const cases = [
      { delete: [own, otherCoven] },
      {
        update: [
          { id: own, input: { quantityOnHand: 1 } },
          { id: otherCoven, input: {} },
        ],
      },
      { delete: [otherIngredientJar, own] },
      { update: [{ id: otherIngredientJar, input: { quantityOnHand: 1 } }] },
      { delete: [goneJar] },
      { delete: ['not-a-uuid'] },
      { create: [{ variantId: otherCovenForm, input: {} }], delete: [own] },
      { create: [{ variantId: ownForm, input: {} }], delete: [own] },
      { create: [{ variantId: 'not-a-uuid', input: {} }], delete: [own] },
    ];
    for (const batch of cases) {
      await expect(save(A, batch)).rejects.toThrow(NotFound);
    }
    expect(await jars()).toEqual(before);
    expect(await cupboardRows()).toHaveLength(0);
  });

  it('refuses a jar twice in one batch, or in two lists', async () => {
    const id = await seedJar();
    await expect(save(A, { delete: [id, id] })).rejects.toThrow(ValidationError);
    await expect(
      save(A, { update: [{ id, input: { quantityOnHand: 1 } }], delete: [id] }),
    ).rejects.toThrow(ValidationError);
    expect(await live()).toHaveLength(1);
  });

  it('refuses a duplicate form in the creates once, with the held message, and writes nothing', async () => {
    const edited = await seedJar({ variantId: oilForm, quantityOnHand: '1', unit: 'g' });
    const before = await jars();

    const refusal = await save(A, {
      create: [
        { variantId: powderForm, input: { quantityOnHand: 2, unit: 'g' } },
        { variantId: powderForm, input: { quantityOnHand: 3, unit: 'g' } },
      ],
      update: [{ id: edited, input: { quantityOnHand: 50 } }],
    }).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues).toEqual([
      { path: ['create', 1, 'variantId'], message: 'Your coven already holds this form' },
    ]);
    expect(await jars()).toEqual(before);
    expect(await cupboardRows()).toHaveLength(0);
  });

  it('refuses a create of a form already held, beside that row', async () => {
    await seedJar();
    const refusal = await save(A, {
      create: [
        { variantId: powderForm, input: {} },
        { variantId: compendiumForm, input: {} },
      ],
    }).catch((error: unknown) => error);
    expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([
      ['create', 1, 'variantId'],
    ]);
    expect(await live()).toHaveLength(1);
  });

  it('answers every bad row at once, prefixed by list and position, and saves none', async () => {
    const first = await seedJar({ variantId: powderForm });
    const second = await seedJar({ variantId: oilForm, lowStockThreshold: '4' });
    const teaForm = await insertVariant(
      sql,
      compendiumIngredient,
      makeVariant({ form: 'Tea' }),
      E.id,
    );
    const before = await jars();

    const refusal = await save(A, {
      create: [
        { variantId: compendiumForm, input: { quantityOnHand: 1, unit: 'g' } },
        { variantId: teaForm, input: { quantityOnHand: -1 } },
      ],
      update: [
        { id: first, input: { quantityOnHand: 3 } },
        { id: second, input: { lowStockThreshold: -2 } },
      ],
    }).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([
      ['create', 1, 'input', 'quantityOnHand'],
      ['update', 1, 'input', 'lowStockThreshold'],
    ]);
    expect(await jars()).toEqual(before);
  });

  it('puts a compendium entry in the cupboard once, on its first jar, and not again', async () => {
    expect(await cupboardRows()).toHaveLength(0);
    await save(A, { create: [{ variantId: compendiumForm, input: {} }] });
    await save(A, { create: [{ variantId: powderForm, input: {} }] });
    expect(await cupboardRows()).toEqual([{ ingredient_id: compendiumIngredient }]);
  });

  it('leaves the cupboard alone when the batch only deletes', async () => {
    const id = await seedJar();
    await save(A, { delete: [id] });
    expect(await live()).toHaveLength(0);
    expect(await cupboardRows()).toHaveLength(0);
  });

  it('does not touch the cupboard for the coven’s own entry', async () => {
    const result = await saveStock(asUser(A), WORKSPACE_W_ID, ownIngredient, {
      ...none,
      create: [{ variantId: ownForm, input: {} }],
    });
    expect(result).toHaveLength(1);
    expect(await cupboardRows()).toHaveLength(0);
  });

  it('refuses a form of a retired entry the cupboard does not name, and keeps one it does', async () => {
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: compendiumIngredient },
      A.id,
    );
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${compendiumIngredient}`;
    await expect(save(A, { create: [{ variantId: powderForm, input: {} }] })).resolves.toHaveLength(
      1,
    );

    await sql`delete from workspace_compendium_entries`;
    await expect(save(A, { create: [{ variantId: oilForm, input: {} }] })).rejects.toThrow(
      NotFound,
    );
  });

  describe('the first-unit default threshold', () => {
    it('applies to each created row and each updated row that gains a first unit', async () => {
      const bare = await seedJar({
        variantId: powderForm,
        unit: null,
        quantityOnHand: null,
        lowStockThreshold: null,
      });
      const result = await save(A, {
        create: [
          { variantId: compendiumForm, input: { quantityOnHand: 1, unit: 'g' } },
          { variantId: oilForm, input: { unit: 'ml' } },
        ],
        update: [{ id: bare, input: { unit: 'piece' } }],
      });
      const byForm = Object.fromEntries(result.map((jar) => [jar.variantId, jar]));
      expect(Number(byForm[compendiumForm].lowStockThreshold)).toBe(10);
      expect(Number(byForm[oilForm].lowStockThreshold)).toBe(15);
      expect(Number(byForm[powderForm].lowStockThreshold)).toBe(3);
    });

    it('keeps a threshold the row states or already holds', async () => {
      const held = await seedJar({ variantId: powderForm, unit: null, lowStockThreshold: '8' });
      const result = await save(A, {
        create: [{ variantId: oilForm, input: { unit: 'g', lowStockThreshold: 2 } }],
        update: [{ id: held, input: { unit: 'g' } }],
      });
      const byForm = Object.fromEntries(result.map((jar) => [jar.variantId, jar]));
      expect(Number(byForm[oilForm].lowStockThreshold)).toBe(2);
      expect(Number(byForm[powderForm].lowStockThreshold)).toBe(8);
    });

    it('never converts a unit: a changed unit keeps its quantity as typed', async () => {
      const id = await seedJar({ quantityOnHand: '5', unit: 'g' });
      const [jar] = await save(A, { update: [{ id, input: { unit: 'oz' } }] });
      expect(Number(jar.quantityOnHand)).toBe(5);
      expect(jar.unit).toBe('oz');
    });
  });

  it('is a no-op for an empty batch: it answers the current jars and writes no row', async () => {
    const id = await seedJar();
    const [before] = await jars();
    const result = await save(A, {});
    expect(result.map((jar) => jar.id)).toEqual([id]);
    expect((await jars())[0]).toEqual(before);
  });

  it('still refuses an empty batch from a viewer', async () => {
    await expect(save(C, {})).rejects.toThrow(Forbidden);
  });

  it('waits for the coven’s stock lock, and writes nothing before it', async () => {
    const holding = async (during: () => Promise<void>) => {
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      let acquired!: () => void;
      const held = new Promise<void>((resolve) => (acquired = resolve));
      const transaction = sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(${COVEN_STOCK_LOCK_NAMESPACE}, hashtext(${WORKSPACE_W_ID}))`;
        acquired();
        await released;
      });
      await held;
      try {
        await during();
      } finally {
        release();
        await transaction;
      }
    };
    let running!: ReturnType<typeof save>;
    await holding(async () => {
      let settled = false;
      running = save(A, { create: [{ variantId: compendiumForm, input: { quantityOnHand: 5 } }] });
      running.then(
        () => (settled = true),
        () => (settled = true),
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false);
      expect(await live()).toHaveLength(0);
    });
    await expect(running).resolves.toHaveLength(1);
  });
});
