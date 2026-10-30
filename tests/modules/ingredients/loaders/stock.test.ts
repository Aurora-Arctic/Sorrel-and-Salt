import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { stockByIngredient } from '@/modules/ingredients';
import { A, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient } from '../../../support/fixtures';

// `Ingredient.stock`'s loader: the jars of every ingredient a page
// lists, in one read. Who may read them is services/stock.test.ts's; this
// file counts the reads, observed at the repository.
const repository = vi.hoisted(() => ({ findStockOfIngredients: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findStockOfIngredients.mockImplementation(actual.findStockOfIngredients);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  repository.findStockOfIngredients.mockClear();
});

/** A coven entry of W's with one jar of its form. */
async function heldEntry(name: string): Promise<{ ingredientId: string; jar: string }> {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({ name, workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
    A.id,
  );
  const variantId = await variantIdOf(sql, ingredientId, 'Testform');
  const jar = await insertStock(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId, variantId },
    A.id,
  );
  return { ingredientId, jar };
}

describe('the stockByIngredient loader', () => {
  it("answers a batch of a coven's ingredients with one read", async () => {
    const first = await heldEntry('Testwort');
    const second = await heldEntry('Mockroot');
    const { stockByIngredient: loader } = buildLoaders({ stockByIngredient }, asUser(A));

    const found = await Promise.all([
      loader.load({ ingredientId: first.ingredientId, workspaceId: WORKSPACE_W_ID }),
      loader.load({ ingredientId: second.ingredientId, workspaceId: WORKSPACE_W_ID }),
    ]);

    expect(found.map((jars) => jars.map((jar) => jar.id))).toEqual([[first.jar], [second.jar]]);
    expect(repository.findStockOfIngredients).toHaveBeenCalledTimes(1);
  });
});
