import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run as runOperation } from '../../../support/graphql/run';

// The `workspaceIngredients` query (M9.4): a coven's ingredients, a page at a
// time, with each entry's stock and categories batched. Which rows the list
// holds, and who may read it, is services/workspace-ingredient-list.test.ts's;
// this file holds the transport's half — the arguments reaching the read, the
// page, one read per page, and the one refusal on the wire.

// The reads a page makes, counted at the repository.
const repository = vi.hoisted(() => ({
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
      $form: String
      $first: Int
      $after: String
    ) {
      workspaceIngredients(
        workspaceId: $workspaceId
        query: $query
        categoryIds: $categoryIds
        form: $form
        first: $first
        after: $after
      ) {
        edges {
          cursor
          node {
            id name categories { name }
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

/** W's own entry and a compendium entry W holds the oil of, each in Protection. */
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
    }),
    A.id,
  );
  held = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Heldwort',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
      categories: ['Protection'],
    }),
    A.id,
  );
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
      { id: own, name: 'Covenwort', categories: [{ name: 'Protection' }], stock: [] },
      {
        id: held,
        name: 'Heldwort',
        categories: [{ name: 'Protection' }],
        stock: [{ id: jar, variant: { form: 'Oil' } }],
      },
    ]);
  });

  it('passes the search, category and form arguments to the read', async () => {
    const [protection] = await sql`
      select id from categories where name = 'Protection' and deleted_at is null`;
    // Why each filter could have answered both: both entries are listed unfiltered.
    expect(await names({})).toEqual(['Covenwort', 'Heldwort']);

    expect(await names({ query: 'cronefixture' })).toEqual(['Covenwort']);
    expect(await names({ categoryIds: [protection.id] })).toEqual(['Covenwort', 'Heldwort']);
    expect(await names({ form: 'oil' })).toEqual(['Heldwort']);
  });

  it("resolves a page's stock, its jars' forms and its categories in one read each", async () => {
    const result = await run(asUser(B));

    expect(result.errors).toBeUndefined();
    expect(result.data?.workspaceIngredients.edges).toHaveLength(2);
    expect(repository.findStockOfIngredients).toHaveBeenCalledTimes(1);
    // One for the categories, one for the forms the jars name.
    expect(repository.findManyOfIngredients).toHaveBeenCalledTimes(2);
  });

  it('is FORBIDDEN to a caller naming a coven they are not in', async () => {
    const result = await run(asUser(D));

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});
