import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import {
  countWorkspaceIngredients,
  listWorkspaceIngredients,
  workspaceIngredientFacets,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// A compendium entry the curators retired (soft-deleted) stays on a
// coven's Ingredients list, its count and its facet counts while that coven's
// live cupboard row names it, by the retired-entry rule
// (claude-docs/db/workspace-compendium-entries.md, "When the compendium
// retires the entry"). Coven W holds the entry; coven X holds a jar of its
// form but no cupboard row, which no service writes but the table does not
// refuse, so X is the coven that could have listed it and must not. Every
// test retires the entry first, so each reads the list as it stands after a
// curator's delete.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entryId: string;
let cupboardRowId: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entryId = await insertIngredient(
    sql,
    makeIngredient({ variants: [makeVariant({ form: 'Herb' })] }),
    E.id,
  );
  cupboardRowId = await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: entryId },
    A.id,
  );
  const [{ id: variantId }] = await sql`
    select id from ingredient_variants where ingredient_id = ${entryId}`;
  await insertStock(
    sql,
    { workspaceId: WORKSPACE_X_ID, ingredientId: entryId, variantId, quantityOnHand: '3' },
    D.id,
  );
  await softDelete('ingredients', entryId, E.id);
});

/** Marks one row deleted, as its own delete would, by `actor`. */
async function softDelete(
  table: 'ingredients' | 'workspace_compendium_entries',
  id: string,
  actor: string,
) {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${actor}, true)`;
    await tx`update ${tx(table)} set deleted_at = now(), deleted_by = ${actor} where id = ${id}`;
  });
}

/**
 * The preconditions every assertion below leans on: the entry exists and is
 * retired, it is the compendium's, and W's cupboard row naming it is live
 * (or, with `rowLive` false, tombstoned).
 */
async function expectPreconditions(rowLive = true) {
  const [entry] = await sql`
    select workspace_id, deleted_at from ingredients where id = ${entryId}`;
  expect(entry.workspace_id).toBeNull();
  expect(entry.deleted_at).not.toBeNull();
  const [row] = await sql`
    select workspace_id, ingredient_id, deleted_at
    from workspace_compendium_entries where id = ${cupboardRowId}`;
  expect(row).toMatchObject({ workspace_id: WORKSPACE_W_ID, ingredient_id: entryId });
  expect(row.deleted_at === null).toBe(rowLive);
}

/** Every id `session` lists in `workspaceId` under `filter`, in the list's order. */
async function listed(
  session: Session,
  workspaceId = WORKSPACE_W_ID,
  filter: Parameters<typeof listWorkspaceIngredients>[2] = {},
): Promise<string[]> {
  const page = await resolvePage({ first: 100 }, (request) =>
    listWorkspaceIngredients(session, workspaceId, filter, request),
  );
  return page.edges.map(({ node }) => node.id);
}

/** The pager's total: how many rows "Page X of Y" counts. */
async function total(session: Session, workspaceId = WORKSPACE_W_ID): Promise<number> {
  return (await countWorkspaceIngredients(session, workspaceId, {}, undefined)).totalCount;
}

/** The facet counts the entry would add to: its form, and the Compendium source segment. */
async function facetCounts(session: Session, workspaceId = WORKSPACE_W_ID) {
  const facets = await workspaceIngredientFacets(session, workspaceId, {});
  return {
    herb: facets.forms.find(({ value }) => value === 'Herb')?.count ?? 0,
    compendium: facets.source.find(({ value }) => value === 'compendium')?.count ?? 0,
  };
}

/** The coven Ingredients search box's own query (`IngredientSearchCupboardMatches`). */
async function typeAhead(session: Session, workspaceId: string, query: string) {
  const answer = await run<{ workspaceIngredients: { edges: { node: { id: string } }[] } }>(
    session,
    `query ($workspaceId: ID!, $query: String, $first: Int) {
      workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {
        edges { node { id } }
      }
    }`,
    { workspaceId, query, first: 25 },
  );
  expect(answer.errors).toBeUndefined();
  return answer.data?.workspaceIngredients.edges.map(({ node }) => node.id);
}

describe('the coven whose live cupboard row names a retired entry', () => {
  it('lists it, to a viewer as to the owner', async () => {
    await expectPreconditions();

    expect(await listed(asUser(A))).toEqual([entryId]);
    expect(await listed(asUser(C))).toEqual([entryId]);
  });

  it('counts it in the pager total and the facet counts, and not once the row is gone', async () => {
    await expectPreconditions();
    expect(await total(asUser(B))).toBe(1);
    expect(await facetCounts(asUser(B))).toEqual({ herb: 1, compendium: 1 });

    await softDelete('workspace_compendium_entries', cupboardRowId, A.id);

    await expectPreconditions(false);
    expect(await total(asUser(B))).toBe(0);
    expect(await facetCounts(asUser(B))).toEqual({ herb: 0, compendium: 0 });
  });

  it('stops listing it once its own cupboard row is removed', async () => {
    // Why it could have listed: the same call lists it while the row is live.
    expect(await listed(asUser(B))).toEqual([entryId]);

    await softDelete('workspace_compendium_entries', cupboardRowId, A.id);

    await expectPreconditions(false);
    expect(await listed(asUser(B))).toEqual([]);
  });

  it('never lists its own deleted ingredient, even one a cupboard row names', async () => {
    // A row naming the coven's own entry is not a cupboard entry, but the
    // table does not refuse it: without the compendium tier on the retired
    // arm, it would bring the coven's deleted entry back.
    const ownId = await insertIngredient(
      sql,
      makeIngredient({ name: 'Ownwort', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: ownId }, A.id);
    // Why it could have listed: live, it lists beside the retired entry.
    expect(await listed(asUser(B))).toEqual([ownId, entryId]);

    await softDelete('ingredients', ownId, A.id);

    await expectPreconditions();
    const [own] = await sql`select workspace_id, deleted_at from ingredients where id = ${ownId}`;
    expect(own).toMatchObject({ workspace_id: WORKSPACE_W_ID });
    expect(own.deleted_at).not.toBeNull();
    expect(await listed(asUser(B))).toEqual([entryId]);
    expect(await total(asUser(B))).toBe(1);
    expect((await facetCounts(asUser(B))).herb).toBe(1);
  });

  // The owner's decision at the build's start: the type-ahead reads the list's
  // own reader, so it offers exactly what the list shows.
  it("suggests it in the coven's type-ahead", async () => {
    await expectPreconditions();

    expect(await typeAhead(asUser(B), WORKSPACE_W_ID, 'Testwort')).toEqual([entryId]);
  });
});

describe('a coven whose cupboard does not name the retired entry', () => {
  it('does not list, count or suggest it', async () => {
    await expectPreconditions();
    // Why it could have: the coven holding it lists and suggests it by the
    // same calls, and X holds a jar of its form.
    expect(await listed(asUser(B))).toEqual([entryId]);
    expect(await typeAhead(asUser(B), WORKSPACE_W_ID, 'Testwort')).toEqual([entryId]);
    const [{ count }] = await sql`
      select count(*)::int as count from inventory_items
      where workspace_id = ${WORKSPACE_X_ID} and ingredient_id = ${entryId}`;
    expect(count).toBe(1);

    expect(await listed(asUser(D), WORKSPACE_X_ID)).toEqual([]);
    expect(await total(asUser(D), WORKSPACE_X_ID)).toBe(0);
    expect(await facetCounts(asUser(D), WORKSPACE_X_ID)).toEqual({ herb: 0, compendium: 0 });
    expect(await typeAhead(asUser(D), WORKSPACE_X_ID, 'Testwort')).toEqual([]);
  });
});
