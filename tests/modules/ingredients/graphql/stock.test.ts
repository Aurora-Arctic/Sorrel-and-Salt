import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { InventoryItemNode } from './types';

// Over the wire: the three mutations a coven's jars are written through, `InventoryItem` as they answer it, and `Ingredient.stock` (the transport's half, claude-docs/testing/layer-ownership.md).
// That is the answer as a fresh read gives it, the stock loader cleared between two writes in one request, and one refusal per error code per field.
// Which roles are refused at which jars is services/stock.test.ts's, and every Zod rule is validation/stock.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** A compendium entry with two forms, and the form ids. */
let entry: string;
let herb: string;
let oil: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(
    sql,
    makeIngredient({ variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })] }),
    E.id,
  );
  herb = await variantIdOf(sql, entry, 'Herb');
  oil = await variantIdOf(sql, entry, 'Oil');
});

const ITEM = `
  id quantityOnHand unit unitDimension lowStockThreshold source acquiredDate
  ingredient { id name stock(workspaceId: "${WORKSPACE_W_ID}") { id quantityOnHand } }
  variant { id form }
  audit { createdBy updatedBy }
`;

const ADD = `mutation ($workspaceId: ID!, $variantId: ID!, $input: StockInput!) {
  addIngredientToWorkspace(workspaceId: $workspaceId, variantId: $variantId, input: $input) { ${ITEM} }
}`;

const UPDATE = `mutation ($workspaceId: ID!, $id: ID!, $input: StockInput!) {
  updateStock(workspaceId: $workspaceId, id: $id, input: $input) { ${ITEM} }
}`;

const DELETE = `mutation ($workspaceId: ID!, $id: ID!) {
  deleteStock(workspaceId: $workspaceId, id: $id)
}`;

const STOCK = `query ($id: ID!, $workspaceId: ID!) {
  ingredient(id: $id) { stock(workspaceId: $workspaceId) { id variant { form } } }
}`;

const add = (session: Session, variantId: string, input: Record<string, unknown> = {}) =>
  run<{ addIngredientToWorkspace: InventoryItemNode }>(session, ADD, {
    workspaceId: WORKSPACE_W_ID,
    variantId,
    input,
  });

const update = (session: Session, id: string, input: Record<string, unknown>) =>
  run<{ updateStock: InventoryItemNode }>(session, UPDATE, {
    workspaceId: WORKSPACE_W_ID,
    id,
    input,
  });

const remove = (session: Session, id: string) =>
  run<{ deleteStock: string }>(session, DELETE, { workspaceId: WORKSPACE_W_ID, id });

/** A raw jar of the herb in W, 5 g. */
const seedJar = () =>
  insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      variantId: herb,
      quantityOnHand: '5',
      unit: 'g',
      lowStockThreshold: '10',
    },
    A.id,
  );

/** How many live jars W holds. */
async function liveJars(): Promise<number> {
  const [row] = await sql`
    select count(*)::int as count from inventory_items
    where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;
  return row.count as number;
}

describe('addIngredientToWorkspace', () => {
  it('answers the jar as a fresh read would, its ingredient and form included', async () => {
    const result = await add(asUser(B), oil, {
      quantityOnHand: 30,
      unit: 'ml',
      source: 'Fixture Apothecary',
      acquiredDate: '2026-10-01',
    });

    expect(result.errors).toBeUndefined();
    const item = result.data?.addIngredientToWorkspace;
    expect(item).toMatchObject({
      quantityOnHand: 30,
      unit: 'ml',
      unitDimension: 'volume',
      lowStockThreshold: 15,
      source: 'Fixture Apothecary',
      acquiredDate: '2026-10-01',
      ingredient: { id: entry },
      variant: { id: oil, form: 'Oil' },
      audit: { createdBy: B.id, updatedBy: B.id },
    });
    expect(item?.ingredient.stock).toEqual([{ id: item?.id, quantityOnHand: 30 }]);
  });

  it('refuses a form the coven holds as VALIDATION beside variantId', async () => {
    await seedJar();

    const result = await add(asUser(B), herb, { quantityOnHand: 10, unit: 'g' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['variantId'] }],
    });
  });

  it('is NOT_FOUND for an entry with no form, whose id names no form to stock', async () => {
    const formless = await insertIngredient(
      sql,
      makeIngredient({ name: 'Formlesswort', nomenclature: 'none', variants: [] }),
      E.id,
    );

    const result = await add(asUser(B), formless);

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('is FORBIDDEN to a viewer, who reads the coven', async () => {
    const result = await add(asUser(C), herb);

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});

describe('updateStock', () => {
  it('answers the changed jar, keeping a field the input leaves out', async () => {
    const id = await seedJar();

    const result = await update(asUser(B), id, { quantityOnHand: 2.5, source: null });

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateStock).toMatchObject({
      id,
      quantityOnHand: 2.5,
      unit: 'g',
      lowStockThreshold: 10,
      source: null,
      variant: { id: herb },
      audit: { createdBy: A.id, updatedBy: B.id },
    });
  });

  it('answers its own stock when one request updates the jar twice', async () => {
    const id = await seedJar();

    const result = await run<{ first: InventoryItemNode; second: InventoryItemNode }>(
      asUser(B),
      `mutation ($workspaceId: ID!, $id: ID!) {
        first: updateStock(workspaceId: $workspaceId, id: $id, input: { quantityOnHand: 1 }) { ${ITEM} }
        second: updateStock(workspaceId: $workspaceId, id: $id, input: { quantityOnHand: 2 }) { ${ITEM} }
      }`,
      { workspaceId: WORKSPACE_W_ID, id },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.first.ingredient.stock).toEqual([{ id, quantityOnHand: 1 }]);
    expect(result.data?.second.ingredient.stock).toEqual([{ id, quantityOnHand: 2 }]);
  });

  it('refuses a negative threshold as VALIDATION on the field', async () => {
    const id = await seedJar();

    const result = await update(asUser(B), id, { lowStockThreshold: -3 });

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['lowStockThreshold'] }],
    });
  });

  it('is FORBIDDEN to a viewer, and NOT_FOUND for an id that is not an id', async () => {
    const id = await seedJar();

    expect((await update(asUser(C), id, { quantityOnHand: 1 })).errors?.[0]?.extensions?.code).toBe(
      'FORBIDDEN',
    );
    expect(
      (await update(asUser(B), 'not-an-id', { quantityOnHand: 1 })).errors?.[0]?.extensions?.code,
    ).toBe('NOT_FOUND');
  });
});

describe('deleteStock', () => {
  it('answers the deleted id, and the jar leaves its ingredient’s stock', async () => {
    const id = await seedJar();

    const result = await remove(asUser(B), id);

    expect(result.errors).toBeUndefined();
    expect(result.data?.deleteStock).toBe(id);
    const after = await run<{ ingredient: { stock: unknown[] } }>(asUser(B), STOCK, {
      id: entry,
      workspaceId: WORKSPACE_W_ID,
    });
    expect(after.data?.ingredient.stock).toEqual([]);
  });

  it('is FORBIDDEN to a viewer, and NOT_FOUND for an id that is not an id', async () => {
    const id = await seedJar();

    expect((await remove(asUser(C), id)).errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await remove(asUser(B), 'not-an-id')).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

describe('saveStock', () => {
  const SAVE = `mutation ($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {
    saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) { ${ITEM} }
  }`;
  const save = (session: Session, input: Record<string, unknown>) =>
    run<{ saveStock: InventoryItemNode[] }>(session, SAVE, {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      input: { create: [], update: [], delete: [], ...input },
    });

  it('answers the ingredient’s live jars after creating, changing and deleting', async () => {
    const held = await seedJar();

    const result = await save(asUser(B), {
      create: [{ variantId: oil, input: { quantityOnHand: 2, unit: 'ml' } }],
      update: [{ id: held, input: { quantityOnHand: 8 } }],
    });

    expect(result.errors).toBeUndefined();
    const jars = result.data?.saveStock ?? [];
    expect(jars.map((jar) => jar.variant.form).sort()).toEqual(['Herb', 'Oil']);
    expect(jars.find((jar) => jar.id === held)).toMatchObject({
      quantityOnHand: 8,
      audit: { updatedBy: B.id },
    });
    expect(jars.find((jar) => jar.variant.form === 'Oil')).toMatchObject({
      unitDimension: 'volume',
      lowStockThreshold: 15,
    });

    const removed = await save(asUser(B), { delete: [held] });
    expect(removed.data?.saveStock.map((jar) => jar.variant.form)).toEqual(['Oil']);
    expect(await liveJars()).toBe(1);
  });

  it('answers each jar’s own stock as the writes left it, in one request', async () => {
    const held = await seedJar();

    const result = await run<{ first: InventoryItemNode[]; second: InventoryItemNode[] }>(
      asUser(B),
      `mutation ($workspaceId: ID!, $ingredientId: ID!, $held: ID!) {
        first: saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId,
          input: { create: [], update: [{ id: $held, input: { quantityOnHand: 1 } }], delete: [] }) { ${ITEM} }
        second: saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId,
          input: { create: [], update: [{ id: $held, input: { quantityOnHand: 2 } }], delete: [] }) { ${ITEM} }
      }`,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, held },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.first[0].ingredient.stock).toEqual([{ id: held, quantityOnHand: 1 }]);
    expect(result.data?.second[0].ingredient.stock).toEqual([{ id: held, quantityOnHand: 2 }]);
  });

  it('is FORBIDDEN to a viewer, though a member may make the same save', async () => {
    const held = await seedJar();
    const batch = { update: [{ id: held, input: { quantityOnHand: 1 } }] };

    expect((await save(asUser(C), batch)).errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await save(asUser(B), batch)).errors).toBeUndefined();
  });

  it('is NOT_FOUND for a jar that is not the ingredient’s', async () => {
    const other = await insertIngredient(
      sql,
      makeIngredient({ name: 'Otherwort', nomenclature: 'none' }),
      E.id,
    );
    const otherJar = await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: other,
        variantId: await variantIdOf(sql, other, 'Testform'),
      },
      A.id,
    );

    const result = await save(asUser(B), {
      create: [{ variantId: herb, input: {} }],
      delete: [otherJar],
    });

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('refuses a bad row as VALIDATION with the list and position in the path', async () => {
    const held = await seedJar();

    const result = await save(asUser(B), {
      create: [{ variantId: oil, input: { quantityOnHand: -1 } }],
      update: [{ id: held, input: { quantityOnHand: 3 } }],
    });
    const second = await save(asUser(B), {
      update: [{ id: held, input: { lowStockThreshold: -3 } }],
    });
    const third = await save(asUser(B), { create: [{ variantId: herb, input: {} }] });

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['create', 0, 'input', 'quantityOnHand'] }],
    });
    expect(second.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['update', 0, 'input', 'lowStockThreshold'] }],
    });
    expect(third.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['create', 0, 'variantId'] }],
    });
  });
});

describe('Ingredient.stock', () => {
  it('is FORBIDDEN naming a coven the caller is not in, at the field', async () => {
    const id = await seedJar();
    const asked = { id: entry, workspaceId: WORKSPACE_W_ID };
    // Why it could have answered: the jar is there, and B reads it.
    const asB = await run<{ ingredient: { stock: { id: string }[] } }>(asUser(B), STOCK, asked);
    expect(asB.data?.ingredient.stock).toEqual([{ id, variant: { form: 'Herb' } }]);

    const asD = await run(asUser(D), STOCK, asked);

    expect(asD.data).toBeNull();
    expect(asD.errors?.[0]).toMatchObject({
      path: ['ingredient', 'stock'],
      extensions: { code: 'FORBIDDEN' },
    });
  });
});
