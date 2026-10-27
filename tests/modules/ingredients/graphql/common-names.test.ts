import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import { makeIngredient } from '../../../support/fixtures';
import type { CommonNameConnection } from './types';

// The transport half of M4.7a's common-name lookup: one bucket, each name
// with its claimants, a page at a time, and the compendium-only mode. Who is
// refused is services/common-name-suggestions.test.ts's, and a signed-out
// caller at every field is tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // Testwort, Fixtura testalis: the compendium entry the factory defaults to.
  await insertIngredient(sql, makeIngredient({ folkNames: ['Fixture Bane'] }), A.id);
});

const run = (session: Session | null, variables: Record<string, unknown>) =>
  runOperation<{ commonNameSuggestions: CommonNameConnection }>(
    session,
    `query ($workspaceId: ID!, $query: String, $first: Int, $after: String) {
      commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first, after: $after) {
        edges { cursor node { value claimants { name canonicalName } } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { workspaceId: WORKSPACE_W_ID, ...variables },
  );

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
});
