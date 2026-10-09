import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import { slugify } from '@/lib/slugify';
import { A, E, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';
import type { CategoryGroupNode } from './types';

// M5.6b's three category-group writes over the wire. This file holds the
// transport's half (claude-docs/testing/layer-ownership.md): the loaders
// cleared by a write, `moveTo` reaching the delete, and per write one refusal
// per error code, read as the browser reads it — a colour under the floor
// beside its own picker, a delete without a group to move the categories to
// beside the move picker. Which roles are refused, and every colour and
// collision rule, are services/category-groups.test.ts's; a signed-out caller
// at every field is tests/db/graphql-query-scopes.test.ts's.

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

// The one non-admin each write refuses here, since `authScopes: { admin: true }`
// is a gate of its own in front of the service: a coven's owner, the most a
// workspace role grants, which is still not the site role these writes turn
// on. Every other role is services/category-groups.test.ts's.
const OWNER = asUser(A);

// Why the refusals could have been something else: the session the scope
// reads says `user`, and E's says `admin`.
it('is testing a session whose site role is `user`, beside an admin', () => {
  expect(OWNER.role).toBe('user');
  expect(asUser(E).role).toBe('admin');
});

describe('createCategoryGroup', () => {
  it('writes one for a site admin, answering it with its colours', async () => {
    const result = await run<{ createCategoryGroup: CategoryGroupNode }>(asUser(E), CREATE, {
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

  it('refuses a coven owner as FORBIDDEN, writing nothing', async () => {
    const result = await run(OWNER, CREATE, { input: input() });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await sql`select 1 from category_groups where name = 'Fixture Wards'`).toHaveLength(0);
  });

  it('answers a colour under the floor as VALIDATION on its own column, naming the ratio', async () => {
    const result = await run(asUser(E), CREATE, { input: input({ colorDark: '#0c5393' }) });

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
    // One set of loaders across the three, so the read before fills the cache.
    const context = { loaders: createLoaders(session) };
    const READ = `query { categories(query: "Testcraft Filed") { edges { node { group { name } } } } }`;
    const before = await run(session, READ, {}, context);
    expect(before.data).toEqual({
      categories: { edges: [{ node: { group: { name: 'Fixture Wards' } } }] },
    });

    const result = await run(
      session,
      UPDATE,
      { id, input: input({ name: 'Fixture Shields' }) },
      context,
    );
    const after = await run(session, READ, {}, context);

    expect(result.errors).toBeUndefined();
    expect(after.data).toEqual({
      categories: { edges: [{ node: { group: { name: 'Fixture Shields' } } }] },
    });
  });

  it('refuses a coven owner as FORBIDDEN, leaving the row; answers an unknown id as NOT_FOUND', async () => {
    const id = await seedGroup('Fixture Kept');
    const before = await groupOf(id);

    const refused = await run(OWNER, UPDATE, { id, input: input() });
    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const missing = await run(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect(await groupOf(id)).toEqual(before);
  });

  it('answers a colour under the floor as VALIDATION on its own column, leaving the row', async () => {
    const id = await seedGroup('Fixture Kept');
    const before = await groupOf(id);

    const result = await run(asUser(E), UPDATE, { id, input: input({ colorLight: '#4e8bc2' }) });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['colorLight'] }],
    });
    expect(await groupOf(id)).toEqual(before);
  });
});

describe('deleteCategoryGroup', () => {
  it('answers a group with categories and no `moveTo` as VALIDATION on `moveTo`, and moves them when given one', async () => {
    const id = await seedGroup('Fixture Wards');
    await sql`
      insert into categories (name, slug, description, group_id, created_by, updated_by)
      values ('Testcraft Moved', 'testcraft-moved', 'Seeded', ${id}, ${E.id}, ${E.id})`;

    const refused = await run(asUser(E), DELETE, { id });
    const moved = await run<{ deleteCategoryGroup: string }>(asUser(E), DELETE, {
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

  it('refuses a coven owner as FORBIDDEN, leaving the row live', async () => {
    const id = await seedGroup('Fixture Standing');

    const result = await run(OWNER, DELETE, { id });

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await groupOf(id)).deleted_at).toBeNull();
  });

  it('answers an unknown id as NOT_FOUND', async () => {
    const result = await run(asUser(E), DELETE, { id: 'not-a-uuid' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});
