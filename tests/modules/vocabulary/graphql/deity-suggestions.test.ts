import { graphql, type ExecutionResult } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, B, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import type { DeitySuggestionConnection } from './types';

// The transport half of MB.130's deity lookup: a page of both buckets, each
// curated row carrying its tradition, refused signed out before the service
// is reached and by the service elsewhere.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      nomenclature: 'none',
      deities: ['Hermes Trismegistus'],
    }),
    A.id,
  );
});

function run(
  session: Session | null,
  variables: Record<string, unknown>,
): Promise<ExecutionResult<{ deitySuggestions: DeitySuggestionConnection }>> {
  return graphql({
    schema,
    source: `query ($workspaceId: ID!, $query: String, $first: Int, $after: String) {
      deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first, after: $after) {
        edges { cursor node { value description tradition curated } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variableValues: { workspaceId: WORKSPACE_W_ID, ...variables },
    contextValue: { session, loaders: createLoaders(session) },
  }) as Promise<ExecutionResult<{ deitySuggestions: DeitySuggestionConnection }>>;
}

describe('deitySuggestions', () => {
  it('answers a member with both buckets, each curated row with its tradition', async () => {
    const result = await run(asUser(B), { query: 'hermes' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.deitySuggestions.edges.map((edge) => edge.node)).toEqual([
      { value: 'Hermes', description: expect.any(String), tradition: 'Greek', curated: true },
      expect.objectContaining({ value: 'Mercury', tradition: 'Roman', curated: true }),
      { value: 'Hermes Trismegistus', description: null, tradition: null, curated: false },
    ]);
  });

  it('lists the curated vocabulary first when no query is given', async () => {
    const result = await run(asUser(B), { first: 3 });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.deitySuggestions.edges.map((edge) => edge.node) ?? [];
    expect(nodes).toHaveLength(3);
    expect(nodes.every((node) => node.curated && node.tradition)).toBe(true);
  });

  it('pages by cursor', async () => {
    const first = await run(asUser(B), { query: 'hermes', first: 1 });
    const page = first.data?.deitySuggestions as DeitySuggestionConnection;
    expect(page.pageInfo.hasNextPage).toBe(true);

    const next = await run(asUser(B), {
      query: 'hermes',
      first: 100,
      after: page.pageInfo.endCursor,
    });

    expect(next.errors).toBeUndefined();
    expect(next.data?.deitySuggestions.edges.map((edge) => edge.node.value)).toEqual([
      'Mercury',
      'Hermes Trismegistus',
    ]);
  });

  it('is refused signed out, before the service is reached', async () => {
    const result = await run(null, { query: 'hermes' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.path).toEqual(['deitySuggestions']);
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });

  it('is refused for a workspace the caller is not a member of', async () => {
    // Why it could have succeeded: D is signed in and a member elsewhere.
    expect(asUser(D).userId).toBe(D.id);

    const result = await run(asUser(D), { query: 'hermes' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});
