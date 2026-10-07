import { createYoga } from 'graphql-yoga';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { noSender } from '../../../support/email-verification';
import { makeIngredient } from '../../../support/fixtures';
import type { Context } from '@/graphql/types';
import type { Answer, CategoryConnection, CategoryNode, FilteredCategories } from './types';

// M5.6 over the wire: the public `categories` list and the admin's three
// writes, run through Yoga with the route's own error mapping, so a refusal
// is asserted as the browser receives it. The services' own rules are
// services/categories.test.ts's; this file holds the transport's half.

// The group reads a page makes, counted at the repository.
const repository = vi.hoisted(() => ({ findManyByIds: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let groupId: string;
beforeAll(async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from category_groups where deleted_at is null order by name, id limit 1`;
  groupId = row.id;
});

beforeEach(async () => {
  repository.findManyByIds.mockClear();
  await sql`truncate ingredients cascade`;
  await sql`delete from categories where name like 'Testcraft%'`;
});

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

async function run<T>(
  session: Session | null,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Answer<T>> {
  const response = await yoga.fetch(
    'http://localhost/graphql',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    { session, loaders: createLoaders(session), emailVerification: noSender },
  );
  return (await response.json()) as Answer<T>;
}

const FIELDS = 'id name slug description group { id name }';

const LIST = `query ($first: Int, $after: String) {
  categories(first: $first, after: $after) {
    edges { cursor node { ${FIELDS} } }
    pageInfo { hasNextPage endCursor }
  }
}`;

const FILTERED = `query ($query: String, $groupId: ID) {
  categories(query: $query, groupId: $groupId) { totalCount edges { node { name } } }
}`;

const CREATE = `mutation ($input: CategoryInput!) { createCategory(input: $input) { ${FIELDS} } }`;
const UPDATE = `mutation ($id: ID!, $input: CategoryInput!) {
  updateCategory(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = 'mutation ($id: ID!) { deleteCategory(id: $id) }';

const input = (name = 'Testcraft') => ({ name, description: 'Made over the wire', groupId });

async function seed(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into categories (name, slug, description, group_id, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded', ${groupId}, ${E.id}, ${E.id})
    returning id`;
  return row.id;
}

describe('categories', () => {
  it('answers a signed-out visitor the vocabulary by name, a page at a time, each with its group', async () => {
    const expected = await sql<{ id: string }[]>`
      select id from categories where deleted_at is null order by name, id`;
    expect(expected.length).toBeGreaterThan(25);

    const result = await run<{ categories: CategoryConnection }>(null, LIST);

    expect(result.errors).toBeUndefined();
    const page = result.data?.categories as CategoryConnection;
    expect(page.edges.map((edge) => edge.node.id)).toEqual(
      expected.slice(0, 25).map((row) => row.id),
    );
    expect(page.pageInfo.hasNextPage).toBe(true);
    for (const { node } of page.edges) expect(node.group.name).toEqual(expect.any(String));
  });

  it('reads the groups of a whole page in one batch', async () => {
    await run(null, LIST, { first: 100 });

    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
  });

  it('counts the vocabulary, and the rows before the page, for "Page X of Y"', async () => {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from categories where deleted_at is null`;
    const first = await run<{
      categories: {
        totalCount: number;
        countBefore: number | null;
        pageInfo: { endCursor: string };
      };
    }>(
      null,
      'query ($after: String) { categories(first: 10, after: $after) { totalCount countBefore pageInfo { endCursor } } }',
    );
    const second = await run<{ categories: { countBefore: number | null } }>(
      null,
      'query ($after: String) { categories(first: 10, after: $after) { countBefore } }',
      { after: first.data?.categories.pageInfo.endCursor },
    );

    expect(first.data?.categories).toMatchObject({ totalCount: n, countBefore: 0 });
    expect(second.data?.categories.countBefore).toBe(10);
  });

  it('pages on from a cursor', async () => {
    const first = await run<{ categories: CategoryConnection }>(null, LIST, { first: 10 });
    const after = first.data?.categories.pageInfo.endCursor;

    const second = await run<{ categories: CategoryConnection }>(null, LIST, { first: 10, after });

    const seen = new Set(first.data?.categories.edges.map((edge) => edge.node.id));
    expect(second.data?.categories.edges).toHaveLength(10);
    for (const edge of second.data?.categories.edges ?? [])
      expect(seen.has(edge.node.id)).toBe(false);
  });

  it('narrows its edges and its count by the query and the group', async () => {
    await seed('Testcraft 100% Pure');
    await seed('Testcraft 100x Pure');
    const [other] = await sql<{ id: string }[]>`
      select id from category_groups where deleted_at is null and id <> ${groupId}
      order by name, id limit 1`;
    // Why the second could have been listed: it sits in the same group, one character off.
    const both = await run<{ categories: { totalCount: number } }>(
      null,
      'query { categories(query: "testcraft 100") { totalCount } }',
    );
    expect(both.data?.categories.totalCount).toBe(2);

    const result = await run<{ categories: FilteredCategories }>(null, FILTERED, {
      query: ' 100% ',
      groupId,
    });
    const elsewhere = await run<{ categories: FilteredCategories }>(null, FILTERED, {
      query: '100%',
      groupId: other.id,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.categories).toEqual({
      totalCount: 1,
      edges: [{ node: { name: 'Testcraft 100% Pure' } }],
    });
    expect(elsewhere.data?.categories).toEqual({ totalCount: 0, edges: [] });
  });

  it('answers a group id that is not a uuid with an empty page, not an error', async () => {
    const result = await run<{ categories: FilteredCategories }>(null, FILTERED, {
      groupId: 'not-a-uuid',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.categories).toEqual({ totalCount: 0, edges: [] });
  });
});

describe('createCategory', () => {
  it('writes one for a site admin, answering it with its group', async () => {
    const result = await run<{ createCategory: CategoryNode }>(asUser(E), CREATE, {
      input: input(),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createCategory).toMatchObject({
      name: 'Testcraft',
      slug: 'testcraft',
      group: { id: groupId },
    });
  });

  it('refuses a member and a signed-out request, as FORBIDDEN, writing nothing', async () => {
    for (const session of [asUser(B), null]) {
      const result = await run(session, CREATE, { input: input() });
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    const rows = await sql`select 1 from categories where name = 'Testcraft'`;
    expect(rows).toHaveLength(0);
  });

  it("answers a slug collision as VALIDATION on `name`, with the service's message", async () => {
    await seed('Testcraft Ward');

    const result = await run(asUser(E), CREATE, { input: input('Testcraft-Ward') });

    expect(result.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['name'],
          message:
            '"Testcraft Ward" already has the address "testcraft-ward" — choose another name',
        },
      ],
    });
  });
});

describe('updateCategory', () => {
  it('rewrites one for a site admin', async () => {
    const id = await seed('Testcraft Old');

    const result = await run<{ updateCategory: CategoryNode }>(asUser(E), UPDATE, {
      id,
      input: input('Testcraft New'),
    });

    expect(result.data?.updateCategory).toMatchObject({ id, name: 'Testcraft New' });
  });

  it('refuses a member as FORBIDDEN, and answers an unknown id as NOT_FOUND', async () => {
    const id = await seed('Testcraft Kept');

    const refused = await run(asUser(B), UPDATE, { id, input: input('Testcraft Taken Over') });
    const missing = await run(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    const [row] = await sql`select name from categories where id = ${id}`;
    expect(row.name).toBe('Testcraft Kept');
  });
});

describe('deleteCategory', () => {
  it('answers the deleted id for a site admin', async () => {
    const id = await seed('Testcraft Unused');

    const result = await run<{ deleteCategory: string }>(asUser(E), DELETE, { id });

    expect(result.data?.deleteCategory).toBe(id);
  });

  it('refuses a member as FORBIDDEN', async () => {
    const id = await seed('Testcraft Standing');

    const result = await run(asUser(B), DELETE, { id });

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it("carries the in-use refusal's message to the admin verbatim", async () => {
    const id = await seed('Testcraft Held');
    await insertIngredient(
      sql,
      makeIngredient({ name: 'Testwort', nomenclature: 'none', categories: ['Testcraft Held'] }),
      E.id,
    );

    const result = await run(asUser(E), DELETE, { id });

    expect(result.errors?.[0]).toMatchObject({
      message:
        '"Testcraft Held" is filed on 1 compendium entry — Testwort (herb). Take it off it first.',
      extensions: { code: 'FORBIDDEN' },
    });
  });
});
