import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { DuplicateNode, DuplicateConnection, Result } from './types';

// The transport half of M4.7's duplicate warning: what M5.10's debounced
// lookup calls — the nodes, the score on each edge, a page at a time, and the
// compendium-only mode. The threshold, the scope and who is refused are
// services/duplicates.test.ts's, and a signed-out caller at every field is
// tests/db/graphql-query-scopes.test.ts's. The table is emptied per test, so
// every row a result could come from is one this file wrote.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** A row of this file's: no formal name, and so `none`, unless one is stated. */
function addIngredient(entry: Overrides<IngredientFixture>): Promise<string> {
  const nomenclature = entry.canonicalName ? 'botanical' : 'none';
  return insertIngredient(sql, makeIngredient({ nomenclature, ...entry }), A.id);
}

const run = (
  session: Session | null,
  variables: { name: string; workspaceId?: string; first?: number; after?: string | null },
): Promise<Result> =>
  runOperation(
    session,
    `query ($workspaceId: ID!, $name: String!, $first: Int, $after: String) {
      possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first, after: $after) {
        edges { cursor score node { id name canonicalName isGlobal folkNames } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { workspaceId: WORKSPACE_W_ID, ...variables },
  );

async function nodesFor(
  session: Session,
  variables: Parameters<typeof run>[1],
): Promise<DuplicateNode[]> {
  const result = await run(session, variables);
  expect(result.errors).toBeUndefined();
  return result.data?.possibleDuplicates.edges.map((edge) => edge.node) ?? [];
}

describe('possibleDuplicates', () => {
  it('answers a member with near-misses, best first, each carrying its formal name', async () => {
    await addIngredient({
      name: 'Mugwort',
      canonicalName: 'Artemisia vulgaris',
      folkNames: ['Cronewort'],
    });
    await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });

    expect(await nodesFor(asUser(B), { name: 'Mugwart' })).toEqual([
      expect.objectContaining({
        name: 'Mugwart',
        canonicalName: null,
        isGlobal: false,
        folkNames: [],
      }),
      expect.objectContaining({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
        isGlobal: true,
        folkNames: ['Cronewort'],
      }),
    ]);
  });

  describe('the score on each edge', () => {
    async function edgesFor(name: string): Promise<{ name: string; score: number }[]> {
      const result = await run(asUser(B), { name });
      expect(result.errors).toBeUndefined();
      return (result.data?.possibleDuplicates.edges ?? []).map((edge) => ({
        name: edge.node.name,
        score: edge.score,
      }));
    }

    it('is 1 for an exact match and the similarity for a near-miss, best first', async () => {
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });
      const [row] = await sql`select similarity(${'Mugwort'}, ${'Mugwart'}) as score`;

      const [exact, nearMiss] = await edgesFor('Mugwart');

      expect(exact).toEqual({ name: 'Mugwart', score: 1 });
      expect(nearMiss.name).toBe('Mugwort');
      expect(nearMiss.score).toBeCloseTo(Number(row.score), 5);
      expect(nearMiss.score).toBeGreaterThanOrEqual(0.4);
      expect(nearMiss.score).toBeLessThan(1);
    });
  });

  describe('pages', () => {
    it('by cursor, through the M3.6 helper', async () => {
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });

      const first = await run(asUser(B), { name: 'Mugwart', first: 1 });
      const page = first.data?.possibleDuplicates as DuplicateConnection;
      expect(page.edges.map((edge) => edge.node.name)).toEqual(['Mugwart']);
      expect(page.pageInfo.hasNextPage).toBe(true);

      const next = await run(asUser(B), {
        name: 'Mugwart',
        first: 1,
        after: page.pageInfo.endCursor,
      });

      expect(next.errors).toBeUndefined();
      const rest = next.data?.possibleDuplicates as DuplicateConnection;
      expect(rest.edges.map((edge) => edge.node.name)).toEqual(['Mugwort']);
      expect(rest.pageInfo.hasNextPage).toBe(false);
    });
  });
});

// M5.5: the admin's compendium form has no coven to name, so a null
// workspaceId warns of the compendium's entries alone.
describe('possibleDuplicates without a coven', () => {
  const runInCompendium = (session: Session | null, name: string): Promise<Result> =>
    runOperation(
      session,
      `query ($workspaceId: ID, $name: String!) {
        possibleDuplicates(workspaceId: $workspaceId, name: $name, first: 100) {
          edges { node { name isGlobal } }
        }
      }`,
      { workspaceId: null, name },
    );

  it("warns of the compendium's entry and not the coven's", async () => {
    await addIngredient({ name: 'Testwort', canonicalName: 'Fixtura testalis' });
    await addIngredient({ name: 'Testwart', workspaceId: WORKSPACE_W_ID });
    // Why its absence is the scope's: under W, the coven's entry is warned of first.
    expect((await nodesFor(asUser(B), { name: 'Testwart' })).map((node) => node.name)).toEqual([
      'Testwart',
      'Testwort',
    ]);

    const result = await runInCompendium(asUser(E), 'Testwart');

    expect(result.errors).toBeUndefined();
    expect(result.data?.possibleDuplicates.edges.map((edge) => edge.node)).toEqual([
      { name: 'Testwort', isGlobal: true },
    ]);
  });
});
