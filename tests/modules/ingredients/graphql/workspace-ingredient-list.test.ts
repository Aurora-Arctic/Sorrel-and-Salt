import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run as runOperation } from '../../../support/graphql/run';

// The `workspaceIngredients` query: a coven's ingredients, a page at a time, each entry's stock and categories batched and its cupboard row read by the page itself.
// Which rows the list holds, and who may read it, is services/workspace-ingredient-list.test.ts's; here: the arguments reaching the read, the page, one read per page, and the one refusal on the wire.

// The reads a page makes, counted at the repository.
const repository = vi.hoisted(() => ({
  findCupboardEntriesOf: vi.fn(),
  findManyOfIngredients: vi.fn(),
  findStockOfIngredients: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

interface ListNode {
  id: string;
  name: string;
  isGlobal: boolean;
  categories: { name: string }[];
  stock: { id: string; variant: { form: string } }[];
}

interface ListConnection {
  edges: { cursor: string; node: ListNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

function run(session: Session | null, variables: Record<string, unknown> = {}) {
  return runOperation<{ workspaceIngredients: ListConnection }>(
    session,
    `query (
      $workspaceId: ID!
      $query: String
      $categoryIds: [ID!]
      $categoryMode: CategoryMode
      $forms: [String!]
      $deityIds: [ID!]
      $zodiacSigns: [String!]
      $celestialBodies: [String!]
      $elements: [IngredientElement!]
      $toxic: ToxicFilter
      $source: IngredientSource
      $inStock: Boolean
      $lowStockOnly: Boolean
      $first: Int
      $after: String
    ) {
      workspaceIngredients(
        workspaceId: $workspaceId
        query: $query
        categoryIds: $categoryIds
        categoryMode: $categoryMode
        forms: $forms
        deityIds: $deityIds
        zodiacSigns: $zodiacSigns
        celestialBodies: $celestialBodies
        elements: $elements
        toxic: $toxic
        source: $source
        inStock: $inStock
        lowStockOnly: $lowStockOnly
        first: $first
        after: $after
      ) {
        edges {
          cursor
          node {
            id name isGlobal categories { name }
            stock(workspaceId: $workspaceId) { id variant { form } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { workspaceId: WORKSPACE_W_ID, ...variables },
  );
}

/** The labels of the one page `variables` answers, as B. */
async function names(variables: Record<string, unknown>): Promise<string[]> {
  const result = await run(asUser(B), variables);
  expect(result.errors).toBeUndefined();
  return result.data?.workspaceIngredients.edges.map((edge) => edge.node.name) ?? [];
}

/** W's own entry, linked to Hecate and listing a sign and a planet, and a compendium entry in W's cupboard with a jar of its oil, flagged toxic; each in Protection. */
let hecate: string;
let own: string;
let held: string;
let jar: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  Object.values(repository).forEach((spy) => spy.mockClear());
  own = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Covenwort',
      nomenclature: 'none',
      workspaceId: WORKSPACE_W_ID,
      folkNames: ['Cronefixture'],
      categories: ['Protection'],
      zodiacSigns: ['Fixture Ram'],
      celestialBodies: ['Fixture Sun'],
      elements: ['fire'],
    }),
    A.id,
  );
  const [deity] = await sql`select id from deities where name = 'Hecate' and deleted_at is null`;
  hecate = deity.id as string;
  await insertDeityLink(sql, own, hecate, 0, A.id);
  held = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Heldwort',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil', toxic: true })],
      categories: ['Protection'],
    }),
    A.id,
  );
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: held }, A.id);
  jar = await insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: held,
      variantId: await variantIdOf(sql, held, 'Oil'),
    },
    A.id,
  );
});

describe('workspaceIngredients', () => {
  it("lists the coven's entries a page at a time, each with its stock", async () => {
    const first = await run(asUser(B), { first: 1 });
    expect(first.errors).toBeUndefined();
    const page = first.data?.workspaceIngredients;
    const tail = await run(asUser(B), { first: 1, after: page?.pageInfo.endCursor });

    expect(page?.pageInfo.hasNextPage).toBe(true);
    expect(tail.data?.workspaceIngredients.pageInfo.hasNextPage).toBe(false);
    const nodes = [page, tail.data?.workspaceIngredients].flatMap(
      (connection) => connection?.edges.map((edge) => edge.node) ?? [],
    );
    expect(nodes).toEqual([
      {
        id: own,
        name: 'Covenwort',
        isGlobal: false,
        categories: [{ name: 'Protection' }],
        stock: [],
      },
      {
        id: held,
        name: 'Heldwort',
        isGlobal: true,
        categories: [{ name: 'Protection' }],
        stock: [{ id: jar, variant: { form: 'Oil' } }],
      },
    ]);
  });

  // Both entries hold Protection and neither Cleansing, so only the
  // mode decides whether the pair lists them.
  it('takes a categoryMode, all by default, and refuses a mode that is neither', async () => {
    const rows = await sql`
      select id, name from categories where name in ('Protection', 'Cleansing') and deleted_at is null`;
    const ids = rows.map((row) => row.id);
    expect(await names({ categoryIds: ids })).toEqual([]);

    expect(await names({ categoryIds: ids, categoryMode: 'all' })).toEqual([]);
    expect(await names({ categoryIds: ids, categoryMode: 'any' })).toEqual([
      'Covenwort',
      'Heldwort',
    ]);

    const refused = await run(asUser(B), { categoryIds: ids, categoryMode: 'some' });
    expect(refused.errors).toHaveLength(1);
  });

  it('passes the search, category and facet arguments to the read', async () => {
    const [protection] = await sql`
      select id from categories where name = 'Protection' and deleted_at is null`;
    // Why each filter could have answered both: both entries are listed unfiltered.
    expect(await names({})).toEqual(['Covenwort', 'Heldwort']);

    expect(await names({ query: 'cronefixture' })).toEqual(['Covenwort']);
    expect(await names({ categoryIds: [protection.id] })).toEqual(['Covenwort', 'Heldwort']);
    expect(await names({ forms: ['Fixture Root', 'oil'] })).toEqual(['Heldwort']);
    expect(await names({ deityIds: [hecate] })).toEqual(['Covenwort']);
    expect(await names({ zodiacSigns: ['fixture ram'] })).toEqual(['Covenwort']);
    expect(await names({ celestialBodies: ['fixture sun'] })).toEqual(['Covenwort']);
    expect(await names({ elements: ['fire', 'air'] })).toEqual(['Covenwort']);
    expect(await names({ elements: ['air'] })).toEqual([]);
    expect(await names({ toxic: 'toxic' })).toEqual(['Heldwort']);
    expect(await names({ toxic: 'not_toxic' })).toEqual(['Covenwort']);
    expect(await names({ toxic: 'any' })).toEqual(['Covenwort', 'Heldwort']);
    // What each of these three matches is services/workspace-ingredient-list.test.ts's.
    const compendium = await run(asUser(B), { source: 'compendium' });
    expect(
      compendium.data?.workspaceIngredients.edges.map(({ node }) => [node.name, node.isGlobal]),
    ).toEqual([['Heldwort', true]]);
    // The local entry has no jar; the held one's has no quantity, so is held, never low.
    expect(await names({ inStock: true })).toEqual(['Heldwort']);
    expect(await names({ lowStockOnly: true })).toEqual([]);
    expect((await run(asUser(B), { source: 'both' })).errors).toHaveLength(1);
  });

  it("resolves a page's stock, its jars' forms and its categories in one read each", async () => {
    const result = await run(asUser(B));

    expect(result.errors).toBeUndefined();
    expect(result.data?.workspaceIngredients.edges).toHaveLength(2);
    expect(repository.findStockOfIngredients).toHaveBeenCalledTimes(1);
    // One for the categories, one for the forms the jars name.
    expect(repository.findManyOfIngredients).toHaveBeenCalledTimes(2);
  });

  it("answers each entry's cupboard row from the page's own read, with no read of its own", async () => {
    await sql`
      update workspace_compendium_entries set label = 'Heldlabel' where ingredient_id = ${held}`;

    const result = await runOperation<{
      workspaceIngredients: {
        edges: { node: { id: string; cupboardEntry: { label: string | null } | null } }[];
      };
    }>(
      asUser(B),
      `query ($workspaceId: ID!) {
        workspaceIngredients(workspaceId: $workspaceId) {
          edges { node { id cupboardEntry(workspaceId: $workspaceId) { label } } }
        }
      }`,
      { workspaceId: WORKSPACE_W_ID },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.workspaceIngredients.edges.map(({ node }) => node)).toEqual([
      { id: own, cupboardEntry: null },
      { id: held, cupboardEntry: { label: 'Heldlabel' } },
    ]);
    expect(repository.findCupboardEntriesOf).not.toHaveBeenCalled();
  });

  it('is FORBIDDEN to a caller naming a coven they are not in', async () => {
    const result = await run(asUser(D));

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});
