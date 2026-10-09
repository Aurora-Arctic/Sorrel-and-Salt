import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, E, asUser } from '../../../support/as-user';
import { curatedFormId } from '../../../support/db/curated-ids';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import { makeIngredient } from '../../../support/fixtures';
import type { FormSuggestionConnection } from './types';

// The transport half of M4.7a's form lookup: the nodes, each curated row
// carrying its group and every suggestion its claimants, an absent query sent
// as none, a page by cursor and the compendium-only mode. Who is refused, what
// each bucket holds and the scope are services/form-suggestions.test.ts's, and
// a signed-out caller at every field is tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // A compendium entry claiming a curated form, and a workspace entry with an
  // uncurated one.
  await insertIngredient(sql, makeIngredient({ form: 'root' }), A.id);
  await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Testbane',
      nomenclature: 'none',
      form: 'root bark',
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
        // MB.167: what a pick sends.
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

  it('lists the curated vocabulary first when no query is given', async () => {
    const result = await run(asUser(B), { first: 3 });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.formSuggestions.edges.map((edge) => edge.node) ?? [];
    expect(nodes).toHaveLength(3);
    expect(nodes.every((node) => node.curated && node.group)).toBe(true);
  });

  it('pages by cursor', async () => {
    const first = await run(asUser(B), { query: 'root', first: 1 });
    const page = first.data?.formSuggestions as FormSuggestionConnection;
    expect(page.pageInfo.hasNextPage).toBe(true);

    const next = await run(asUser(B), {
      query: 'root',
      first: 100,
      after: page.pageInfo.endCursor,
    });

    expect(next.errors).toBeUndefined();
    expect(next.data?.formSuggestions.edges.map((edge) => edge.node.value)).toEqual([
      'Bark',
      'root bark',
    ]);
  });
});

// M5.5: the admin's compendium form has no coven to name, so a null
// workspaceId reads the compendium tier alone.
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
      makeIngredient({ name: 'Fixture Rootling', nomenclature: 'none', form: 'rootlet fixture' }),
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

  it('is refused signed out', async () => {
    // Why it could have answered: the same call signed in asks no membership.
    expect((await runInCompendium(asUser(B), { query: 'root' })).errors).toBeUndefined();

    const result = await runInCompendium(null, { query: 'root' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      path: ['formSuggestions'],
      extensions: { code: 'FORBIDDEN' },
    });
  });
});
