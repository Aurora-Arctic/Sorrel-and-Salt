import { graphql, type ExecutionResult } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { ValidationError } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, B, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { noSender } from '../../../support/email-verification';
import { makeIngredient } from '../../../support/fixtures';

// The `compendium` query over the standard seed's 26 entries: public (MB.80),
// filtered in SQL, a page at a time, with folk names and categories batched.

// The reads a page makes, counted at the repository so the batching is a
// number rather than a hope; the role lookup is counted to show a public
// page never makes one.
const repository = vi.hoisted(() => ({
  findManyOfIngredients: vi.fn(),
  findManyByIds: vi.fn(),
  findWorkspaceRole: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: ReturnType<typeof postgres>;
let categoryIds: Map<string, string>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  // A coven's own row, beside the seed, to be left out of every answer below.
  await insertIngredient(
    sql,
    makeIngredient({ name: 'Fixture Wroot', workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
    A.id,
  );
  const rows = await sql`select id, name from categories where deleted_at is null`;
  categoryIds = new Map(rows.map((row) => [row.name as string, row.id as string]));
});

beforeEach(() => {
  Object.values(repository).forEach((spy) => spy.mockClear());
});

interface Node {
  id: string;
  name: string;
  canonicalName: string | null;
  nomenclature: string;
  form: string | null;
  isGlobal: boolean;
  folkNames: string[];
  categories: { name: string; group: { name: string; colorDark: string } }[];
}

interface Connection {
  edges: { cursor: string; node: Node }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

function run(
  session: Session | null,
  variables: Record<string, unknown> = {},
): Promise<ExecutionResult<{ compendium: Connection }>> {
  return graphql({
    schema,
    source: `query ($search: String, $categoryIds: [ID!], $form: String, $first: Int, $after: String) {
      compendium(search: $search, categoryIds: $categoryIds, form: $form, first: $first, after: $after) {
        edges {
          cursor
          node {
            id name slug canonicalName nomenclature form isGlobal folkNames
            categories { name group { name colorDark } }
            audit { createdBy }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variableValues: variables,
    contextValue: { session, loaders: createLoaders(session), emailVerification: noSender },
  }) as Promise<ExecutionResult<{ compendium: Connection }>>;
}

// Fifty, not the maximum: a page of 100 with categories and their groups costs
// more than MAX_COST allows, by design (claude-docs/graphql.md, "Protections"),
// and the seed holds 26.
async function nodesOf(variables: Record<string, unknown>, session: Session | null = null) {
  const result = await run(session, { first: 50, ...variables });
  expect(result.errors).toBeUndefined();
  const data = result.data as { compendium: Connection };
  return data.compendium.edges.map((edge) => edge.node);
}

/** The compendium's live ids in the finder's order, from the database's own collation. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select id from ingredients where workspace_id is null and deleted_at is null order by name, id`;
  return rows.map((row) => row.id);
}

const category = (name: string) => categoryIds.get(name) as string;

describe('compendium', () => {
  it('lists the seeded compendium to a signed-out visitor, a page at a time', async () => {
    const expected = await expectedOrder();
    expect(expected).toHaveLength(26);
    // The precondition for what is left out: a coven's row exists.
    const [{ count }] = await sql`
      select count(*)::int as count from ingredients where workspace_id is not null`;
    expect(count).toBe(1);

    const first = await run(null);
    expect(first.errors).toBeUndefined();
    const page = first.data?.compendium as Connection;
    const rest = await run(null, { after: page.pageInfo.endCursor });
    const tail = rest.data?.compendium as Connection;

    expect(page.edges).toHaveLength(25);
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(tail.edges).toHaveLength(1);
    const nodes = [...page.edges, ...tail.edges].map((edge) => edge.node);
    expect(nodes.map((node) => node.id)).toEqual(expected);
    expect(nodes.every((node) => node.isGlobal)).toBe(true);
    expect(nodes.map((node) => node.name)).not.toContain('Fixture Wroot');
  });

  it("leaves a coven's own row out for its member too", async () => {
    const names = (await nodesOf({}, asUser(B))).map((node) => node.name);

    expect(names).toHaveLength(26);
    expect(names).not.toContain('Fixture Wroot');
  });

  it('narrows by search, telling five entries sharing a label apart by their formal name', async () => {
    const nodes = await nodesOf({ search: 'cat' });

    expect(nodes.map((node) => node.name)).toEqual(Array(5).fill("Cat's Claw"));
    expect(nodes.map((node) => node.canonicalName).sort()).toEqual([
      'Dolichandra unguis-cati',
      'Felis catus',
      'Senegalia greggii',
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);
  });

  it('matches a folk name, accents folded', async () => {
    const nodes = await nodesOf({ search: 'una de gato' });

    expect(nodes.map((node) => node.canonicalName).sort()).toEqual([
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);
    expect(nodes.every((node) => node.folkNames.includes('Uña de Gato'))).toBe(true);
  });

  it('narrows by categories, every one of them', async () => {
    const both = await nodesOf({ categoryIds: [category('Healing'), category('Strength')] });
    const healing = await nodesOf({ categoryIds: [category('Healing')] });

    expect(both.map((node) => node.canonicalName)).toEqual(['Uncaria tomentosa']);
    expect(healing.map((node) => node.name).sort()).toEqual([
      "Cat's Claw",
      "Cat's Claw",
      'Comfrey',
    ]);
  });

  it('narrows by form, folded', async () => {
    const nodes = await nodesOf({ form: 'BARK' });

    expect(nodes.map((node) => node.canonicalName).sort()).toEqual([
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);
  });

  it('combines the three', async () => {
    const nodes = await nodesOf({
      search: 'cat',
      form: 'bark',
      categoryIds: [category('Healing'), category('Strength')],
    });

    expect(nodes.map((node) => node.canonicalName)).toEqual(['Uncaria tomentosa']);
  });

  it('resolves the categories, their groups and the folk names of a page in a read each', async () => {
    const result = await run(null);

    expect(result.errors).toBeUndefined();
    const page = result.data?.compendium as Connection;
    expect(page.edges.some((edge) => edge.node.categories.length > 0)).toBe(true);
    expect(page.edges.some((edge) => edge.node.folkNames.length > 0)).toBe(true);
    // Folk names and category links, then categories and their groups.
    expect(repository.findManyOfIngredients).toHaveBeenCalledTimes(2);
    expect(repository.findManyByIds).toHaveBeenCalledTimes(2);
    expect(repository.findWorkspaceRole).not.toHaveBeenCalled();
  });

  it('refuses a malformed cursor as bad input', async () => {
    const result = await run(null, { after: 'not-a-cursor' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toBe('Invalid cursor');
  });

  it('refuses a category id that is not a uuid as a validation error', async () => {
    const result = await run(null, { categoryIds: ['not-a-uuid'] });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(ValidationError);
  });
});
