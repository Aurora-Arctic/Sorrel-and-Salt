import { graphql } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import { encodeCursor } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { DuplicateNode, DuplicateConnection, Result } from './types';

// The transport half of M4.7's duplicate warning: what M5.10's debounced
// lookup calls. The table is emptied per test, so every row a result could
// come from is one this file wrote.

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

function run(
  session: Session | null,
  variables: { name: string; workspaceId?: string; first?: number; after?: string | null },
): Promise<Result> {
  return graphql({
    schema,
    source: `query ($workspaceId: ID!, $name: String!, $first: Int, $after: String) {
      possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first, after: $after) {
        edges { cursor score node { id name canonicalName isGlobal folkNames } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variableValues: { workspaceId: WORKSPACE_W_ID, ...variables },
    contextValue: { session, loaders: createLoaders(session) },
  }) as Promise<Result>;
}

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

    it('is the best of the label, the formal name and the folk names', async () => {
      await addIngredient({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
        folkNames: ['Cronewort'],
      });
      // Why the label alone would score it lower: it is not even a match.
      const [row] = await sql`select similarity(${'Mugwort'}, ${'Cronewort'}) as score`;
      expect(Number(row.score)).toBeLessThan(0.4);

      expect(await edgesFor('Cronewort')).toEqual([{ name: 'Mugwort', score: 1 }]);
    });
  });

  it('answers a blank name with an empty page', async () => {
    await addIngredient({ name: 'Mugwort' });

    expect(await nodesFor(asUser(B), { name: '  ' })).toEqual([]);
  });

  // M4.7's threshold, reached through the field: 0.31 clears pg_trgm's 0.3
  // default and not DESIGN.md's 0.4, so only the set threshold excludes it.
  it('matches at 0.4, not the database default of 0.3', async () => {
    await addIngredient({ name: 'Mugwort Leaf' });

    // Why it could have come back: at the default it is a match.
    const [row] = await sql`
      select ${'Mugwort Leaf'} % ${'Mugwart'} as matched,
        similarity(${'Mugwort Leaf'}, ${'Mugwart'}) as score`;
    expect(row.matched).toBe(true);
    expect(Number(row.score)).toBeLessThan(0.4);

    expect(await nodesFor(asUser(B), { name: 'Mugwart' })).toEqual([]);
  });

  describe('scope', () => {
    let compendium: string;
    let ours: string;
    let theirs: string;
    let theirsByFolkName: string;

    beforeEach(async () => {
      compendium = await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      ours = await addIngredient({ name: 'Mugwurt', workspaceId: WORKSPACE_W_ID });
      theirs = await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_X_ID });
      theirsByFolkName = await addIngredient({
        name: 'Crone Herb',
        workspaceId: WORKSPACE_X_ID,
        folkNames: ['Mugwart Herb'],
      });
    });

    it('returns compendium and current-workspace matches only', async () => {
      // Why X's could have come back: they are matches, and X's own member sees them.
      const fromX = await nodesFor(asUser(D), { name: 'Mugwart', workspaceId: WORKSPACE_X_ID });
      expect(fromX.map((node) => node.id)).toEqual(
        expect.arrayContaining([theirs, theirsByFolkName]),
      );

      const fromW = await nodesFor(asUser(B), { name: 'Mugwart' });

      expect(fromW.map((node) => node.id).sort()).toEqual([compendium, ours].sort());
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

    it('at 25 without a first, however many match', async () => {
      await sql`
        insert into ingredients (name, slug, nomenclature, created_by, updated_by)
        select 'Mugwort ' || g, 'mugwort-' || g, 'none', ${A.id}, ${A.id}
        from generate_series(1, 26) g`;

      const result = await run(asUser(B), { name: 'Mugwort' });

      expect(result.errors).toBeUndefined();
      expect(result.data?.possibleDuplicates.edges).toHaveLength(25);
      expect(result.data?.possibleDuplicates.pageInfo.hasNextPage).toBe(true);
    });

    // A browse of the compendium keys `[name]`; this list keys `[-score, name]`.
    it('refuses a cursor from another list', async () => {
      const id = await addIngredient({ name: 'Mugwurt', workspaceId: WORKSPACE_W_ID });
      const after = encodeCursor({ key: ['Mugwurt'], id });

      const result = await run(asUser(B), { name: 'Mugwart', after });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.message).toBe('Invalid cursor');
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Mugwurt', workspaceId: WORKSPACE_W_ID });
    });

    it('answers a viewer, who may read the workspace’s ingredients', async () => {
      expect((await nodesFor(asUser(C), { name: 'Mugwart' })).map((node) => node.name)).toEqual([
        'Mugwurt',
      ]);
    });

    it('is refused signed out, before the service is reached', async () => {
      const result = await run(null, { name: 'Mugwart' });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.path).toEqual(['possibleDuplicates']);
      expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
    });

    // The resolver checks only that there is a session; this refusal is the
    // service's `assertMembership`.
    it('is refused by the service for a workspace the caller is not a member of', async () => {
      // Why it could have succeeded: D is signed in, and answered in its own workspace.
      expect(await nodesFor(asUser(D), { name: 'Mugwart', workspaceId: WORKSPACE_X_ID })).toEqual(
        [],
      );

      const result = await run(asUser(D), { name: 'Mugwart' });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
    });

    it('is refused for a site admin, who belongs to no workspace', async () => {
      const result = await run(asUser(E), { name: 'Mugwart' });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
    });
  });
});
