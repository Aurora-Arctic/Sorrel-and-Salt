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
import type { CompendiumConnection } from './types';

// The `compendium` query over the standard seed's 26 entries: public (MB.80),
// filtered in SQL, a page at a time, with folk names and categories batched.

// The reads a page makes, counted at the repository so the batching is a
// number rather than a hope; the role lookup is counted to show a public
// page never makes one, and the count to show it runs only when asked for.
const repository = vi.hoisted(() => ({
  findCompendiumCount: vi.fn(),
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

function run(
  session: Session | null,
  variables: Record<string, unknown> = {},
): Promise<ExecutionResult<{ compendium: CompendiumConnection }>> {
  return graphql({
    schema,
    source: `query ($query: String, $categoryIds: [ID!], $form: String, $first: Int, $after: String) {
      compendium(query: $query, categoryIds: $categoryIds, form: $form, first: $first, after: $after) {
        edges {
          cursor
          score
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
  }) as Promise<ExecutionResult<{ compendium: CompendiumConnection }>>;
}

// Fifty, not the maximum: a page of 100 with categories and their groups costs
// more than MAX_COST allows, by design (claude-docs/graphql/protections.md, "Protections"),
// and the seed holds 26.
async function nodesOf(variables: Record<string, unknown>, session: Session | null = null) {
  const result = await run(session, { first: 50, ...variables });
  expect(result.errors).toBeUndefined();
  const data = result.data as { compendium: CompendiumConnection };
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
    const page = first.data?.compendium as CompendiumConnection;
    const rest = await run(null, { after: page.pageInfo.endCursor });
    const tail = rest.data?.compendium as CompendiumConnection;

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
    const nodes = await nodesOf({ query: 'cat' });

    expect(nodes.map((node) => node.name)).toEqual(Array(5).fill("Cat's Claw"));
    expect(nodes.map((node) => node.canonicalName).sort()).toEqual([
      'Dolichandra unguis-cati',
      'Felis catus',
      'Senegalia greggii',
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);
  });

  // `sal` is a whole word of four seeded labels and half of two more: two
  // scores, each tied, so the order shows the score first and the name second.
  it('ranks a search best match first, with the score on each edge', async () => {
    const result = await run(null, { query: 'sal', first: 50 });
    expect(result.errors).toBeUndefined();
    const edges = (result.data as { compendium: CompendiumConnection }).compendium.edges;

    expect(edges.map((edge) => [edge.node.name, edge.score])).toEqual([
      ['Black Salt', 0.75],
      ['Rosemary', 0.75],
      ['Saltpetre', 0.75],
      ['Sea Salt', 0.75],
      ['Mugwort', 0.5],
      ['Selenite', 0.5],
    ]);
  });

  it('carries a null score on a list with no search', async () => {
    const result = await run(null);

    expect(result.errors).toBeUndefined();
    const edges = (result.data as { compendium: CompendiumConnection }).compendium.edges;
    expect(edges).toHaveLength(25);
    expect(edges.every((edge) => edge.score === null)).toBe(true);
  });

  it('treats a one-character query as no query: every entry, unranked', async () => {
    const result = await run(null, { query: 'c', first: 50 });

    expect(result.errors).toBeUndefined();
    const edges = (result.data as { compendium: CompendiumConnection }).compendium.edges;
    expect(edges.map((edge) => edge.node.id)).toEqual(await expectedOrder());
    expect(edges.every((edge) => edge.score === null)).toBe(true);
  });

  it('matches a folk name, accents folded', async () => {
    const nodes = await nodesOf({ query: 'una de gato' });

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
      query: 'cat',
      form: 'bark',
      categoryIds: [category('Healing'), category('Strength')],
    });

    expect(nodes.map((node) => node.canonicalName)).toEqual(['Uncaria tomentosa']);
  });

  it('resolves the categories, their groups and the folk names of a page in a read each', async () => {
    const result = await run(null);

    expect(result.errors).toBeUndefined();
    const page = result.data?.compendium as CompendiumConnection;
    expect(page.edges.some((edge) => edge.node.categories.length > 0)).toBe(true);
    expect(page.edges.some((edge) => edge.node.folkNames.length > 0)).toBe(true);
    // Folk names and category links, then categories and their groups.
    expect(repository.findManyOfIngredients).toHaveBeenCalledTimes(2);
    expect(repository.findManyByIds).toHaveBeenCalledTimes(2);
    expect(repository.findWorkspaceRole).not.toHaveBeenCalled();
  });

  describe('page numbers', () => {
    interface Counted {
      totalCount: number;
      countBefore: number | null;
      edges: { node: { id: string } }[];
      pageInfo: { endCursor: string | null };
    }

    async function counted(variables: Record<string, unknown>): Promise<Counted> {
      const result = await graphql({
        schema,
        source: `query ($query: String, $first: Int, $after: String, $last: Int) {
          compendium(query: $query, first: $first, after: $after, last: $last) {
            totalCount countBefore edges { node { id } } pageInfo { endCursor }
          }
        }`,
        variableValues: variables,
        contextValue: { session: null, loaders: createLoaders(null), emailVerification: noSender },
      });
      expect(result.errors).toBeUndefined();
      return (result.data as { compendium: Counted }).compendium;
    }

    // 26 entries at 10 a page: "Page 1 of 3", "Page 2 of 3", and Last asking
    // for the remainder, 26 % 10, rather than a whole page that would start
    // mid-page and read as page 2.
    it('gives a signed-out visitor the size of the list and the page’s place in it', async () => {
      const first = await counted({ first: 10 });
      const second = await counted({ first: 10, after: first.pageInfo.endCursor });
      const last = await counted({ last: first.totalCount % 10 || 10 });

      expect(first.totalCount).toBe(26);
      expect([first, second, last].map((page) => page.countBefore)).toEqual([0, 10, 20]);
      expect(last.edges).toHaveLength(6);
      expect([first, second, last].map((page) => page.totalCount)).toEqual([26, 26, 26]);
    });

    it('counts a search, and places an empty page nowhere', async () => {
      const page = await counted({ query: 'sal', first: 50 });
      const empty = await counted({ query: 'zzzzqx' });

      expect(page.totalCount).toBe(6);
      expect(page.countBefore).toBe(0);
      expect(empty).toMatchObject({ totalCount: 0, countBefore: null, edges: [] });
    });

    it('counts only when a count field is selected, and once for both', async () => {
      await run(null);
      expect(repository.findCompendiumCount).not.toHaveBeenCalled();

      await counted({ first: 10 });
      expect(repository.findCompendiumCount).toHaveBeenCalledTimes(1);
    });
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
