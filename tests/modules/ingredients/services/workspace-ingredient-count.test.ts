import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { resolveNumberedPage } from '@/lib/pagination';
import { countWorkspaceIngredients, listWorkspaceIngredients } from '@/modules/ingredients';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { type IngredientFixture, makeIngredient } from '../../../support/fixtures';
import type { Overrides } from '../../../support/fixtures';

// The count behind the coven list's "Page X of Y" (M9.6): the same rows as
// `listWorkspaceIngredients`, counted under the same proof.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

function add(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

/** A compendium entry in `workspaceId`'s cupboard. */
async function held(name: string): Promise<string> {
  const id = await add(name);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: id }, A.id);
  return id;
}

/** W's cupboard: two own entries and one held compendium entry; X holds same-named rows. */
async function seed(): Promise<void> {
  await add('Fixture Own', { workspaceId: WORKSPACE_W_ID });
  await add('Fixture Second', { workspaceId: WORKSPACE_W_ID });
  const shared = await held('Fixture Held');
  await add('Fixture Own', { workspaceId: WORKSPACE_X_ID });
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: shared }, A.id);
  await add('Fixture Unheld');
}

describe('countWorkspaceIngredients', () => {
  // The viewer stands for every role: reading is one permission owner, member
  // and viewer all hold (tests/modules/coven/services/access-control.test.ts).
  it("counts the coven's own entries and held compendium entries for its viewer", async () => {
    await seed();

    await expect(
      countWorkspaceIngredients(asUser(C), WORKSPACE_W_ID, {}, undefined),
    ).resolves.toEqual({ totalCount: 3, countBefore: null });
  });

  it("never counts another coven's entries or cupboard rows, though they share names", async () => {
    await seed();

    const w = await countWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, {}, undefined);
    const x = await countWorkspaceIngredients(asUser(D), WORKSPACE_X_ID, {}, undefined);

    // X holds an own entry of the same name and a cupboard row on the same compendium entry; W's own entries are not among its two.
    expect(w.totalCount).toBe(3);
    expect(x.totalCount).toBe(2);
  });

  it('refuses a member of another coven by direct workspace id, where a member succeeds', async () => {
    await seed();

    await expect(
      countWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, {}, undefined),
    ).resolves.toMatchObject({ totalCount: 3 });
    await expect(
      countWorkspaceIngredients(asUser(D), WORKSPACE_W_ID, {}, undefined),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it.each([
    ['site admin', E],
    ['site curator', F],
  ])('refuses a %s in no coven', async (_, user) => {
    await seed();

    await expect(
      countWorkspaceIngredients(asUser(user), WORKSPACE_W_ID, {}, undefined),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('agrees with the page under the coven-only settings', async () => {
    await seed();
    const jarred = await held('Fixture Jarred');
    await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: jarred,
        variantId: await variantIdOf(sql, jarred, 'Testform'),
        deleted: false,
        quantityOnHand: '2',
        lowStockThreshold: null,
      },
      A.id,
    );

    for (const filter of [
      {},
      { source: 'local' },
      { source: 'compendium' },
      { inStock: true },
    ] as const) {
      const listed = await listWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, filter, {
        limit: 100,
        inverted: false,
      });
      const { totalCount } = await countWorkspaceIngredients(
        asUser(B),
        WORKSPACE_W_ID,
        filter,
        undefined,
      );
      expect(totalCount).toBe(listed.length);
    }
  });

  it("places a page's first row among the rows before it", async () => {
    await seed();
    const session = asUser(B);
    const fetch = (request: Parameters<typeof listWorkspaceIngredients>[3]) =>
      listWorkspaceIngredients(session, WORKSPACE_W_ID, {}, request);
    const count = (start: Parameters<typeof countWorkspaceIngredients>[3]) =>
      countWorkspaceIngredients(session, WORKSPACE_W_ID, {}, start);

    const first = await resolveNumberedPage({}, fetch, count, 2);
    const second = await resolveNumberedPage({ after: first.pageInfo.endCursor! }, fetch, count, 2);

    expect(first.position).toEqual({ page: 1, pages: 2 });
    expect(second.position).toEqual({ page: 2, pages: 2 });
    expect(second.edges).toHaveLength(1);
  });
});
