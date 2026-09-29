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

// The transport half of M4.7a's common-name lookup: one bucket, each name
// with its claimants, refused signed out before the service is reached and by
// the service elsewhere.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // Testwort, Fixtura testalis: the compendium entry the factory defaults to.
  await insertIngredient(sql, makeIngredient({ folkNames: ['Fixture Bane'] }), A.id);
});

interface Connection {
  edges: { cursor: string; node: Record<string, unknown> }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

function run(
  session: Session | null,
  variables: Record<string, unknown>,
): Promise<ExecutionResult<{ commonNameSuggestions: Connection }>> {
  return graphql({
    schema,
    source: `query ($workspaceId: ID!, $query: String, $first: Int, $after: String) {
      commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first, after: $after) {
        edges { cursor node { value claimants { name canonicalName } } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variableValues: { workspaceId: WORKSPACE_W_ID, ...variables },
    contextValue: { session, loaders: createLoaders(session) },
  }) as Promise<ExecutionResult<{ commonNameSuggestions: Connection }>>;
}

describe('commonNameSuggestions', () => {
  it('answers a member with the names in use and who answers to each', async () => {
    const result = await run(asUser(B), {});

    expect(result.errors).toBeUndefined();
    const claimant = { name: 'Testwort', canonicalName: 'Fixtura testalis' };
    expect(result.data?.commonNameSuggestions.edges.map((edge) => edge.node)).toEqual([
      { value: 'Fixture Bane', claimants: [claimant] },
      { value: 'Testwort', claimants: [claimant] },
    ]);
  });

  it('pages by cursor', async () => {
    const first = await run(asUser(B), { first: 1 });
    const page = first.data?.commonNameSuggestions as Connection;
    expect(page.pageInfo.hasNextPage).toBe(true);

    const next = await run(asUser(B), { first: 100, after: page.pageInfo.endCursor });

    expect(next.errors).toBeUndefined();
    expect(next.data?.commonNameSuggestions.edges.map((edge) => edge.node.value)).toEqual([
      'Testwort',
    ]);
  });

  it('is refused signed out, before the service is reached', async () => {
    const result = await run(null, { query: 'testwort' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.path).toEqual(['commonNameSuggestions']);
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });

  it('is refused for a workspace the caller is not a member of', async () => {
    // Why it could have succeeded: D is signed in and a member elsewhere.
    expect(asUser(D).userId).toBe(D.id);

    const result = await run(asUser(D), { query: 'testwort' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});
