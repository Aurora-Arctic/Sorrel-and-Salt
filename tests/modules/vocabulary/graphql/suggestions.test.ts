import { graphql, type ExecutionResult } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import type { AstrologySuggestionConnection } from './types';

// The transport half of MB.94: two connection fields over one type, a page
// each, refused by the schema before the service is reached when signed
// out and by the service when signed in elsewhere (DESIGN.md §7).

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // One workspace entry with an uncurated value in each column.
  await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Sedna Water',
      nomenclature: 'none',
      planets: ['Sedna'],
      zodiacSigns: ['Cetus'],
    }),
    A.id,
  );
});

const PAGE = `{
  edges { cursor node { value description curated } }
  pageInfo { hasNextPage endCursor }
}`;

function run(
  session: Session | null,
  field: 'planetSuggestions' | 'zodiacSuggestions',
  variables: Record<string, unknown>,
): Promise<ExecutionResult<Record<string, AstrologySuggestionConnection>>> {
  return graphql({
    schema,
    source: `query ($workspaceId: ID!, $query: String, $first: Int, $after: String) {
      ${field}(workspaceId: $workspaceId, query: $query, first: $first, after: $after) ${PAGE}
    }`,
    variableValues: { workspaceId: WORKSPACE_W_ID, ...variables },
    contextValue: { session, loaders: createLoaders(session) },
  }) as Promise<ExecutionResult<Record<string, AstrologySuggestionConnection>>>;
}

describe('planetSuggestions', () => {
  it('answers a member with a page of both buckets', async () => {
    const result = await run(asUser(B), 'planetSuggestions', { query: 'sedna' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.planetSuggestions.edges.map((edge) => edge.node)).toEqual([
      { value: 'Sedna', description: null, curated: false },
    ]);
  });

  it('lists the whole vocabulary, alphabetically, when no query is given', async () => {
    const result = await run(asUser(B), 'planetSuggestions', { first: 2 });

    expect(result.errors).toBeUndefined();
    expect(result.data?.planetSuggestions.edges.map((edge) => edge.node.value)).toEqual([
      'Ceres',
      'Chiron',
    ]);
  });

  it('pages by cursor', async () => {
    const first = await run(asUser(B), 'planetSuggestions', { query: 'moon', first: 1 });
    expect(first.errors).toBeUndefined();
    const page = first.data?.planetSuggestions as AstrologySuggestionConnection;
    expect(page.edges.map((edge) => edge.node.value)).toEqual(['Moon']);
    expect(page.pageInfo.hasNextPage).toBe(true);

    const next = await run(asUser(B), 'planetSuggestions', {
      query: 'moon',
      first: 100,
      after: page.pageInfo.endCursor,
    });

    expect(next.errors).toBeUndefined();
    const rest = next.data?.planetSuggestions as AstrologySuggestionConnection;
    expect(rest.edges.map((edge) => edge.node.value)).not.toContain('Moon');
    expect(rest.edges[0]?.node).toMatchObject({ value: 'Lilith', curated: true });
    expect(rest.pageInfo.hasNextPage).toBe(false);
  });

  it('is refused signed out, before the service is reached', async () => {
    const result = await run(null, 'planetSuggestions', { query: 'sedna' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.path).toEqual(['planetSuggestions']);
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });

  it('is refused for a workspace the caller is not a member of', async () => {
    // Why it could have succeeded: D is signed in and a member elsewhere.
    expect(asUser(D).userId).toBe(D.id);

    const result = await run(asUser(D), 'planetSuggestions', { query: 'sedna' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});

describe('zodiacSuggestions', () => {
  it('answers from the zodiac vocabulary and the zodiac signs in use', async () => {
    const result = await run(asUser(B), 'zodiacSuggestions', { query: 'cetus' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.zodiacSuggestions.edges.map((edge) => edge.node)).toEqual([
      { value: 'Cetus', description: null, curated: false },
    ]);

    const sign = await run(asUser(B), 'zodiacSuggestions', { query: 'serpent' });
    expect(sign.data?.zodiacSuggestions.edges.map((edge) => edge.node.value)).toEqual([
      'Ophiuchus',
    ]);
  });
});

// M5.5: the admin's compendium form has no coven to name, so a null
// workspaceId reads the compendium tier alone — the curated rows, and the
// values written in the compendium, never a coven's.
describe.each([
  ['planetSuggestions', 'sedna', 'Sedna', 'Sedna Fixture'],
  ['zodiacSuggestions', 'cetus', 'Cetus', 'Cetus Fixture'],
] as const)('%s without a coven', (field, query, covens, compendiums) => {
  beforeEach(async () => {
    await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Starwort',
        nomenclature: 'none',
        planets: ['Sedna Fixture'],
        zodiacSigns: ['Cetus Fixture'],
      }),
      A.id,
    );
  });

  const runInCompendium = (session: Session | null, variables: Record<string, unknown>) =>
    graphql({
      schema,
      source: `query ($workspaceId: ID, $query: String) {
        ${field}(workspaceId: $workspaceId, query: $query, first: 100) ${PAGE}
      }`,
      variableValues: { workspaceId: null, ...variables },
      contextValue: { session, loaders: createLoaders(session) },
    }) as Promise<ExecutionResult<Record<string, AstrologySuggestionConnection>>>;

  it("offers the compendium's value and not the coven's", async () => {
    // Why its absence is the scope's: under W, the coven's value is offered beside it.
    const underW = await run(asUser(B), field, { query });
    expect(underW.data?.[field].edges.map((edge) => edge.node.value)).toEqual([
      covens,
      compendiums,
    ]);

    const result = await runInCompendium(asUser(E), { query });

    expect(result.errors).toBeUndefined();
    expect(result.data?.[field].edges.map((edge) => edge.node)).toEqual([
      { value: compendiums, description: null, curated: false },
    ]);
  });

  it('offers the curated rows', async () => {
    const result = await runInCompendium(asUser(E), {});

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.[field].edges.map((edge) => edge.node) ?? [];
    expect(nodes.filter((node) => node.curated).length).toBeGreaterThan(10);
  });

  it('is refused signed out', async () => {
    const result = await runInCompendium(null, { query });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });
});
