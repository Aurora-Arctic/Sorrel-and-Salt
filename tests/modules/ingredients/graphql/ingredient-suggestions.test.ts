import { graphql } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, B, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { Answer, DuplicateNode, IngredientSuggestionConnection } from './types';

// The transport half of the substitute picker's search (MB.138), which
// MB.131's combobox calls. The table is emptied per test, so every row a
// result could come from is one this file wrote.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

function addIngredient(entry: Overrides<IngredientFixture>): Promise<string> {
  const nomenclature = entry.canonicalName ? 'botanical' : 'none';
  return insertIngredient(sql, makeIngredient({ nomenclature, ...entry }), A.id);
}

function run(
  session: Session | null,
  variables: { query?: string; workspaceId?: string; first?: number; after?: string | null },
): Promise<Answer<{ ingredientSuggestions: IngredientSuggestionConnection }>> {
  return graphql({
    schema,
    source: `query ($workspaceId: ID!, $query: String, $first: Int, $after: String) {
      ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first, after: $after) {
        edges { cursor node { id name canonicalName isGlobal folkNames } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variableValues: { workspaceId: WORKSPACE_W_ID, ...variables },
    contextValue: { session, loaders: createLoaders(session) },
  }) as Promise<Answer<{ ingredientSuggestions: IngredientSuggestionConnection }>>;
}

async function nodesFor(
  session: Session,
  variables: Parameters<typeof run>[1],
): Promise<DuplicateNode[]> {
  const result = await run(session, variables);
  expect(result.errors).toBeUndefined();
  return result.data?.ingredientSuggestions.edges.map((edge) => edge.node) ?? [];
}

describe('ingredientSuggestions', () => {
  it('answers a member with ingredients, each carrying its formal name and tier', async () => {
    await addIngredient({
      name: 'Mugwort',
      canonicalName: 'Artemisia vulgaris',
      folkNames: ['Cronewort'],
    });
    await addIngredient({ name: 'Mugwort Root', workspaceId: WORKSPACE_W_ID });

    expect(await nodesFor(asUser(B), { query: 'mugwort' })).toEqual([
      expect.objectContaining({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
        isGlobal: true,
        folkNames: ['Cronewort'],
      }),
      expect.objectContaining({
        name: 'Mugwort Root',
        canonicalName: null,
        isGlobal: false,
        folkNames: [],
      }),
    ]);
  });

  it('lists the compendium and this coven with no query', async () => {
    await addIngredient({ name: 'Yarrow', workspaceId: WORKSPACE_W_ID });
    await addIngredient({ name: 'Mugwort' });
    // Why it could have come back: it is X's, and listed there.
    await addIngredient({ name: 'Lovage', workspaceId: WORKSPACE_X_ID });
    expect(
      (await nodesFor(asUser(D), { workspaceId: WORKSPACE_X_ID })).map((node) => node.name),
    ).toContain('Lovage');

    const names = (await nodesFor(asUser(B), {})).map((node) => node.name);

    expect(names).toEqual(['Mugwort', 'Yarrow']);
  });

  it('refuses a member of another coven, as the service does', async () => {
    const result = await run(asUser(D), { query: 'mugwort' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.path).toEqual(['ingredientSuggestions']);
    expect(
      (result.errors?.[0] as { originalError?: unknown } | undefined)?.originalError,
    ).toBeInstanceOf(Forbidden);
  });

  it('pages by cursor, through the M3.6 helper', async () => {
    await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
    await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });

    const first = await run(asUser(B), { query: 'mugwort', first: 1 });
    const page = first.data?.ingredientSuggestions as IngredientSuggestionConnection;
    expect(page.edges.map((edge) => edge.node.name)).toEqual(['Mugwort']);
    expect(page.pageInfo.hasNextPage).toBe(true);

    const next = await run(asUser(B), {
      query: 'mugwort',
      first: 1,
      after: page.pageInfo.endCursor,
    });

    expect(next.errors).toBeUndefined();
    const rest = next.data?.ingredientSuggestions as IngredientSuggestionConnection;
    expect(rest.edges.map((edge) => edge.node.name)).toEqual(['Mugwart']);
    expect(rest.pageInfo.hasNextPage).toBe(false);
  });
});
