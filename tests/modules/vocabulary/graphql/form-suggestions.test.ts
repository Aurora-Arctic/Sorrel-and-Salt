import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, E, asUser } from '../../../support/as-user';
import { curatedFormId } from '../../../support/db/curated-ids';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import type { FormSuggestionConnection } from './types';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => (sql = client));

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await insertIngredient(sql, makeIngredient({ variants: [makeVariant({ form: 'root' })] }), A.id);
  await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Testbane',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'root bark' })],
    }),
    A.id,
  );
});

const run = (session: Session | null, variables: Record<string, unknown>) =>
  runOperation<{ formSuggestions: FormSuggestionConnection }>(
    session,
    `query ($workspaceId: ID!, $query: String, $first: Int, $after: String) {
      formSuggestions(workspaceId: $workspaceId, query: $query, first: $first, after: $after) {
        edges { cursor node { id value description group curated claimants { name canonicalName } } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { workspaceId: WORKSPACE_W_ID, ...variables },
  );

describe('formSuggestions', () => {
  it('answers a member with both buckets, the group and the claimants', async () => {
    const result = await run(asUser(B), { query: 'root' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.formSuggestions.edges.map((edge) => edge.node)).toEqual([
      {
        id: await curatedFormId(sql, 'Root'),
        value: 'Root',
        description: expect.any(String),
        group: 'Botanical',
        curated: true,
        claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
      },
      expect.objectContaining({ value: 'Bark', group: 'Botanical', claimants: [] }),
      {
        id: null,
        value: 'root bark',
        description: null,
        group: null,
        curated: false,
        claimants: [{ name: 'Testbane', canonicalName: null }],
      },
    ]);
  });
});

// The admin's compendium form has no coven to name, so a null workspaceId reads the compendium tier alone.
describe('formSuggestions without a coven', () => {
  const runInCompendium = (session: Session | null, variables: Record<string, unknown>) =>
    runOperation<{ formSuggestions: FormSuggestionConnection }>(
      session,
      `query ($workspaceId: ID, $query: String) {
        formSuggestions(workspaceId: $workspaceId, query: $query, first: 100) {
          edges { node { value group curated claimants { name } } }
        }
      }`,
      { workspaceId: null, ...variables },
    );

  it("offers the curated forms with the compendium's claimants, and not the coven's value", async () => {
    await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Rootling',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'rootlet fixture' })],
      }),
      A.id,
    );
    // Why its absence is the scope's: under W, the coven's value is offered.
    const underW = await run(asUser(B), { query: 'root', first: 100 });
    expect(underW.data?.formSuggestions.edges.map((edge) => edge.node.value)).toContain(
      'root bark',
    );

    const result = await runInCompendium(asUser(E), { query: 'root' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.formSuggestions.edges.map((edge) => edge.node)).toEqual([
      { value: 'Root', group: 'Botanical', curated: true, claimants: [{ name: 'Testwort' }] },
      { value: 'Bark', group: 'Botanical', curated: true, claimants: [] },
      {
        value: 'rootlet fixture',
        group: null,
        curated: false,
        claimants: [{ name: 'Fixture Rootling' }],
      },
    ]);
  });
});
