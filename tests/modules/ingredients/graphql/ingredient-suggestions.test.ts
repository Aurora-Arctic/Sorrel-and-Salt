import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, D, asUser } from '../../../support/as-user';
import { liveFolkNames } from '../../../support/db/folk-names';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
} from '../../../support/fixtures';
import type { DuplicateNode, IngredientSuggestionConnection } from './types';

// The transport half of the substitute picker's search, which
// the combobox calls: the nodes, a page at a time, and one refusal on the
// wire. What it matches, its scope and who is refused are
// services/ingredient-suggestions.test.ts's. The table is emptied per test, so
// every row a result could come from is one this file wrote.

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

const run = (
  session: Session | null,
  variables: {
    query?: string;
    form?: string;
    workspaceId?: string;
    first?: number;
    after?: string | null;
  },
) =>
  runOperation<{ ingredientSuggestions: IngredientSuggestionConnection }>(
    session,
    `query ($workspaceId: ID!, $query: String, $form: String, $first: Int, $after: String) {
      ingredientSuggestions(workspaceId: $workspaceId, query: $query, form: $form, first: $first, after: $after) {
        edges { cursor group node { id name canonicalName isGlobal folkNames { id name } } }
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
  return result.data?.ingredientSuggestions.edges.map((edge) => edge.node) ?? [];
}

describe('ingredientSuggestions', () => {
  it('answers a member with ingredients, each carrying its formal name and tier', async () => {
    const mugwort = await addIngredient({
      name: 'Mugwort',
      canonicalName: 'Artemisia vulgaris',
      folkNames: ['Cronewort'],
    });
    await addIngredient({ name: 'Mugwort Root', workspaceId: WORKSPACE_W_ID });

    expect(await nodesFor(asUser(B), { query: 'mugwort' })).toEqual([
      expect.objectContaining({
        name: 'Mugwort Root',
        canonicalName: null,
        isGlobal: false,
        folkNames: [],
      }),
      expect.objectContaining({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
        isGlobal: true,
        folkNames: await liveFolkNames(sql, mugwort),
      }),
    ]);
  });

  it('refuses a member of another coven as FORBIDDEN', async () => {
    // Why it could have answered: D is signed in, and answered in its own coven.
    expect((await run(asUser(D), { workspaceId: WORKSPACE_X_ID })).errors).toBeUndefined();

    const result = await run(asUser(D), { query: 'mugwort' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      path: ['ingredientSuggestions'],
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('ranks by the form asked for and pages on through the ranking', async () => {
    await addIngredient({ name: 'Fixture A Plain', variants: [makeVariant({ form: 'Powder' })] });
    await addIngredient({ name: 'Fixture B Group', variants: [makeVariant({ form: 'Resin' })] });
    await addIngredient({ name: 'Fixture C Exact', variants: [makeVariant({ form: 'Root' })] });

    const first = await run(asUser(B), { form: 'root', first: 2 });
    const page = first.data?.ingredientSuggestions as IngredientSuggestionConnection;
    const next = await run(asUser(B), {
      form: 'root',
      first: 2,
      after: page.pageInfo.endCursor,
    });

    expect(page.edges.map((edge) => edge.node.name)).toEqual([
      'Fixture C Exact',
      'Fixture B Group',
    ]);
    expect(next.data?.ingredientSuggestions.edges.map((edge) => edge.node.name)).toEqual([
      'Fixture A Plain',
    ]);
  });

  it("offers the coven's own entry and the compendium's same-named one, in two groups", async () => {
    const compendium = await addIngredient({
      name: 'Mugwort',
      canonicalName: 'Artemisia vulgaris',
    });
    const own = await addIngredient({ name: 'Mugwort', workspaceId: WORKSPACE_W_ID });

    const result = await run(asUser(B), { query: 'mugwort' });

    expect(result.errors).toBeUndefined();
    expect(
      result.data?.ingredientSuggestions.edges.map((edge) => [edge.group, edge.node.id]),
    ).toEqual([
      ['yours', own],
      ['compendium', compendium],
    ]);
  });
});
