import { graphql } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { noSender } from '../../../support/email-verification';
import type { Context } from '@/graphql/types';
import type { Answer, CategoryGroupNode } from './types';

// M5.6b's three category-group writes, run through Yoga with the route's own
// error mapping, so a refusal is asserted as the browser receives it: a colour
// under the floor beside its own picker, a delete without a group to move the
// categories to beside the move picker. The services' own rules are
// services/category-groups.test.ts's.

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});
afterAll(() => sql.end());

let seededId: string;
beforeAll(async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from category_groups where deleted_at is null order by name, id limit 1`;
  seededId = row.id;
});

beforeEach(async () => {
  await sql`delete from categories where name like 'Testcraft%'`;
  await sql`delete from category_groups where name like 'Fixture %'`;
});

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

async function send<T>(
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

const FIELDS = 'id name slug description colorDark colorLight';
const CREATE = `mutation ($input: CategoryGroupInput!) {
  createCategoryGroup(input: $input) { ${FIELDS} }
}`;
const UPDATE = `mutation ($id: ID!, $input: CategoryGroupInput!) {
  updateCategoryGroup(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = 'mutation ($id: ID!, $moveTo: ID) { deleteCategoryGroup(id: $id, moveTo: $moveTo) }';

const input = (extra: Record<string, unknown> = {}) => ({
  name: 'Fixture Wards',
  description: 'Made over the wire',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
  ...extra,
});

async function seedGroup(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into category_groups (name, slug, color_dark, color_light, description, created_by, updated_by)
    values (${name}, ${slugify(name)}, '#4e8bc2', '#0c5393', 'Seeded', ${E.id}, ${E.id})
    returning id`;
  return row.id;
}

const groupOf = async (id: string) =>
  (await sql`select * from category_groups where id = ${id}`)[0];

describe('createCategoryGroup', () => {
  it('writes one for a site admin, answering it with its colours', async () => {
    const result = await send<{ createCategoryGroup: CategoryGroupNode }>(asUser(E), CREATE, {
      input: input(),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createCategoryGroup).toMatchObject({
      name: 'Fixture Wards',
      slug: 'fixture-wards',
      colorDark: '#4e8bc2',
      colorLight: '#0c5393',
    });
  });

  it('refuses every non-admin, the coven owner A included, and a signed-out request, as FORBIDDEN, writing nothing', async () => {
    for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
      const result = await send(session, CREATE, { input: input() });
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    expect(await sql`select 1 from category_groups where name = 'Fixture Wards'`).toHaveLength(0);
  });

  it('answers a colour under the floor as VALIDATION on its own column, naming the ratio', async () => {
    const result = await send(asUser(E), CREATE, { input: input({ colorDark: '#0c5393' }) });

    expect(result.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['colorDark'],
          message: 'The dark theme colour reads 2.16:1 on the dark card — it needs at least 4.5:1',
        },
      ],
    });
  });
});

describe('updateCategoryGroup', () => {
  it("rewrites one for a site admin, and a category's group read after it in the same request reads the new name", async () => {
    const id = await seedGroup('Fixture Wards');
    await sql`
      insert into categories (name, slug, description, group_id, created_by, updated_by)
      values ('Testcraft Filed', 'testcraft-filed', 'Seeded', ${id}, ${E.id}, ${E.id})`;
    const session = asUser(E);
    const context = { session, loaders: createLoaders(session), emailVerification: noSender };
    const READ = `query { categories(query: "Testcraft Filed") { edges { node { group { name } } } } }`;
    const before = await graphql({ schema, source: READ, contextValue: context });
    expect(before.data).toEqual({
      categories: { edges: [{ node: { group: { name: 'Fixture Wards' } } }] },
    });

    const result = await graphql({
      schema,
      source: UPDATE,
      variableValues: { id, input: input({ name: 'Fixture Shields' }) },
      contextValue: context,
    });
    const after = await graphql({ schema, source: READ, contextValue: context });

    expect(result.errors).toBeUndefined();
    expect(after.data).toEqual({
      categories: { edges: [{ node: { group: { name: 'Fixture Shields' } } }] },
    });
  });

  it('refuses every non-admin and a signed-out request as FORBIDDEN, leaving the row; answers an unknown id as NOT_FOUND', async () => {
    const id = await seedGroup('Fixture Kept');
    const before = await groupOf(id);

    for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
      const refused = await send(session, UPDATE, { id, input: input() });
      expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    const missing = await send(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect(await groupOf(id)).toEqual(before);
  });
});

describe('deleteCategoryGroup', () => {
  it('answers a group with categories and no `moveTo` as VALIDATION on `moveTo`, and moves them when given one', async () => {
    const id = await seedGroup('Fixture Wards');
    await sql`
      insert into categories (name, slug, description, group_id, created_by, updated_by)
      values ('Testcraft Moved', 'testcraft-moved', 'Seeded', ${id}, ${E.id}, ${E.id})`;

    const refused = await send(asUser(E), DELETE, { id });
    const moved = await send<{ deleteCategoryGroup: string }>(asUser(E), DELETE, {
      id,
      moveTo: seededId,
    });

    expect(refused.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['moveTo'], message: 'Choose a group to move its 1 category to' }],
    });
    expect(moved.data?.deleteCategoryGroup).toBe(id);
    const [category] = await sql`select group_id from categories where name = 'Testcraft Moved'`;
    expect(category.group_id).toBe(seededId);
    expect((await groupOf(id)).deleted_at).toBeInstanceOf(Date);
  });

  it('refuses every non-admin and a signed-out request as FORBIDDEN, leaving the row live', async () => {
    const id = await seedGroup('Fixture Standing');

    for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
      const result = await send(session, DELETE, { id });
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    expect((await groupOf(id)).deleted_at).toBeNull();
  });
});
