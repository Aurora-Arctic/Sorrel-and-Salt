import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { CATEGORY_GROUPS } from '@/db/seed/category-groups';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { slugify } from '@/lib/slugify';
import {
  countCategoryGroups,
  createCategoryGroup,
  deleteCategoryGroup,
  getCategoryGroupBySlug,
  listCategoryGroups,
  updateCategoryGroup,
} from '@/modules/vocabulary';
import type { CategoryGroupInput } from '@/modules/vocabulary/validation/category-group';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Story 18's category-group half (M5.6b): the groups' writes, the site
// admin's alone. Each colour is held to 4.5:1 against its own theme's harder
// surface (MB.36). A group is deleted only once its live categories have
// somewhere to go: the admin names a group, and they move there in the same
// write, their links untouched (claude-docs/design-decisions/m5.6b-admin-groups.md).
// The seeded groups stay, so every group a test writes is `Fixture …` and
// every category `Testcraft …`.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** A seeded group, the one a moved category lands in. */
let seededId: string;
beforeAll(async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from category_groups where deleted_at is null order by name, id limit 1`;
  seededId = row.id;
});

// Every row a test writes goes, the links before the categories before the groups.
beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`delete from categories where name like 'Testcraft%'`;
  await sql`delete from category_groups where name like 'Fixture %'`;
});

const admin = asUser(E);

// The site role is the one thing a vocabulary write turns on, so one non-admin
// stands for every one (claude-docs/testing/acting-as-fixture-users.md): an
// owner, whose workspace role is the highest and is still no site role.
const NON_ADMINS = [['an owner of a coven', A]] as const;

it('is testing sessions whose site role is `user`, beside an admin', () => {
  for (const [, user] of NON_ADMINS) expect(asUser(user).role).toBe('user');
  expect(admin.role).toBe('admin');
});

function input(overrides: Partial<CategoryGroupInput> = {}): CategoryGroupInput {
  return {
    name: 'Fixture Wards',
    description: 'A group this test made',
    colorDark: '#4e8bc2',
    colorLight: '#0c5393',
    ...overrides,
  };
}

/** Seeds a group directly, stamped by A — not through the code under test. */
async function seedGroup(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into category_groups (name, slug, color_dark, color_light, description, created_by, updated_by)
    values (${name}, ${slugify(name)}, '#4e8bc2', '#0c5393', 'Seeded by the test', ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

/** Seeds a category under `groupId`, stamped by A. */
async function seedCategory(name: string, groupId: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into categories (name, slug, description, group_id, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded by the test', ${groupId}, ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

async function groupOf(id: string) {
  const [row] = await sql`select * from category_groups where id = ${id}`;
  return row;
}

async function categoryOf(id: string) {
  const [row] = await sql`select * from categories where id = ${id}`;
  return row;
}

const countNamed = async (name: string) => {
  const [row] = await sql`select count(*)::int as n from category_groups where name = ${name}`;
  return row.n as number;
};

/** An issue list, or the test fails because the write went through. */
async function issuesOf(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('listCategoryGroups', () => {
  it('pages the live groups alphabetically by name, a deleted one left out', async () => {
    const deleted = await seedGroup('Fixture Gone');
    await sql`update category_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;
    const expected = await sql<{ id: string }[]>`
      select id from category_groups where deleted_at is null order by name, id`;
    expect(expected.length).toBeGreaterThan(1);

    const page = await resolvePage({ first: 100 }, listCategoryGroups);

    expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.map((row) => row.id));
  });
});

// "Page X of Y" on the group page: what the list pages, counted in its order.
describe('countCategoryGroups', () => {
  it('counts the groups listCategoryGroups pages, and how many come before a page’s first row', async () => {
    const first = await resolvePage({ first: 2 }, listCategoryGroups);
    const [{ cursor: startOfSecond }] = await listCategoryGroups({
      after: decodeCursor(first.pageInfo.endCursor as string),
      limit: 1,
      inverted: false,
    });
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from category_groups where deleted_at is null`;
    // The precondition: more than one page of two.
    expect(n).toBeGreaterThan(2);

    await expect(countCategoryGroups(undefined)).resolves.toEqual({
      totalCount: n,
      countBefore: null,
    });
    await expect(countCategoryGroups(startOfSecond)).resolves.toEqual({
      totalCount: n,
      countBefore: 2,
    });
  });
});

describe('getCategoryGroupBySlug', () => {
  it('answers the live group holding the address', async () => {
    const id = await seedGroup('Fixture Found');

    await expect(getCategoryGroupBySlug('fixture-found')).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a deleted one, and for an address nothing holds', async () => {
    const id = await seedGroup('Fixture Gone');
    await sql`update category_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;

    await expect(getCategoryGroupBySlug('fixture-gone')).rejects.toThrow(NotFound);
    await expect(getCategoryGroupBySlug('no-such-group')).rejects.toThrow(NotFound);
  });
});

describe('createCategoryGroup', () => {
  it('lets the site admin create one, its slug from the name, stamped by them', async () => {
    const created = await createCategoryGroup(admin, input({ colorDark: '#4E8BC2' }));

    expect(await groupOf(created.id)).toMatchObject({
      name: 'Fixture Wards',
      slug: 'fixture-wards',
      description: 'A group this test made',
      color_dark: '#4e8bc2',
      color_light: '#0c5393',
      seed_key: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });
  });

  it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
    await expect(createCategoryGroup(asUser(user), input())).rejects.toThrow(Forbidden);
    expect(await countNamed('Fixture Wards')).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(
      createCategoryGroup(asUser(B), input({ colorDark: '#000000' })),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a colour under the floor on its own column, naming the ratio, writing nothing', async () => {
    const issues = await issuesOf(createCategoryGroup(admin, input({ colorDark: '#0c5393' })));

    expect(issues).toEqual([
      {
        path: ['colorDark'],
        message: expect.stringContaining('2.16:1'),
      },
    ]);
    expect(await countNamed('Fixture Wards')).toBe(0);
  });

  it('refuses a name whose address a live group holds, on `name`, naming it', async () => {
    await seedGroup('Fixture Wards');

    const issues = await issuesOf(createCategoryGroup(admin, input({ name: 'Fixture-Wards' })));

    expect(issues).toEqual([
      {
        path: ['name'],
        message: expect.stringContaining('Fixture Wards'),
      },
    ]);
    expect(await countNamed('Fixture-Wards')).toBe(0);
  });

  it("takes a deleted group's address", async () => {
    const gone = await seedGroup('Fixture Wards');
    await sql`update category_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    const created = await createCategoryGroup(admin, input());

    expect(created.slug).toBe('fixture-wards');
  });
});

describe('updateCategoryGroup', () => {
  it('lets the site admin rewrite it, the slug following the name, created_by kept', async () => {
    const id = await seedGroup('Fixture Wards');

    await updateCategoryGroup(
      admin,
      id,
      input({ name: 'Fixture Shields', colorDark: '#35987d', colorLight: '#097255' }),
    );

    expect(await groupOf(id)).toMatchObject({
      name: 'Fixture Shields',
      slug: 'fixture-shields',
      color_dark: '#35987d',
      color_light: '#097255',
      created_by: A.id,
      updated_by: E.id,
    });
  });

  // A category's slug is its name alone, so a group's rename moves nothing else.
  it('rewrites none of its categories', async () => {
    const id = await seedGroup('Fixture Wards');
    const category = await seedCategory('Testcraft Kept', id);
    const before = await categoryOf(category);

    await updateCategoryGroup(admin, id, input({ name: 'Fixture Shields' }));

    expect(await categoryOf(category)).toEqual(before);
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seedGroup('Fixture Wards');
    const before = await groupOf(id);

    await expect(
      updateCategoryGroup(asUser(user), id, input({ name: 'Fixture Shields' })),
    ).rejects.toThrow(Forbidden);
    expect(await groupOf(id)).toEqual(before);
  });

  it('refuses a colour under the floor on its own column, leaving the row as it was', async () => {
    const id = await seedGroup('Fixture Wards');
    const before = await groupOf(id);

    const issues = await issuesOf(updateCategoryGroup(admin, id, input({ colorLight: '#4e8bc2' })));

    expect(issues).toEqual([
      {
        path: ['colorLight'],
        message: expect.any(String),
      },
    ]);
    expect(await groupOf(id)).toEqual(before);
  });

  it("refuses a rename onto another group's address, on `name`", async () => {
    await seedGroup('Fixture Shields');
    const id = await seedGroup('Fixture Wards');

    const issues = await issuesOf(
      updateCategoryGroup(admin, id, input({ name: 'Fixture Shields' })),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['name'] })]);
    expect((await groupOf(id)).name).toBe('Fixture Wards');
  });

  // So editing a seeded group never trips the check (MB.36).
  it('accepts every seeded group saved back as it is', async () => {
    const seeded = await sql<
      { id: string; name: string; description: string; color_dark: string; color_light: string }[]
    >`select id, name, description, color_dark, color_light from category_groups
      where seed_key is not null and deleted_at is null`;
    expect(seeded).toHaveLength(CATEGORY_GROUPS.length);

    for (const row of seeded) {
      await expect(
        updateCategoryGroup(admin, row.id, {
          name: row.name,
          description: row.description,
          colorDark: row.color_dark,
          colorLight: row.color_light,
        }),
      ).resolves.toMatchObject({ id: row.id });
    }
  });

  it('answers NotFound for a deleted group, for an id that names nothing, and for one that is not a uuid', async () => {
    const gone = await seedGroup('Fixture Gone');
    await sql`update category_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    for (const id of [gone, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      await expect(updateCategoryGroup(admin, id, input())).rejects.toThrow(NotFound);
    }
  });
});

describe('deleteCategoryGroup', () => {
  it('lets the site admin soft-delete one with no categories, keeping the row', async () => {
    const id = await seedGroup('Fixture Wards');

    await deleteCategoryGroup(admin, id);

    expect(await groupOf(id)).toMatchObject({
      deleted_by: E.id,
      deleted_at: expect.any(Date),
    });
  });

  it('moves its live categories to the group named, in the same write, then deletes it', async () => {
    const id = await seedGroup('Fixture Wards');
    const first = await seedCategory('Testcraft First', id);
    const second = await seedCategory('Testcraft Second', id);
    const deleted = await seedCategory('Testcraft Deleted', id);
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;

    await deleteCategoryGroup(admin, id, seededId);

    for (const category of [first, second]) {
      expect(await categoryOf(category)).toMatchObject({
        group_id: seededId,
        slug: expect.stringMatching(/^testcraft-/),
        updated_by: E.id,
        deleted_at: null,
      });
    }
    // A deleted category is a row no writer touches (rule 4).
    expect((await categoryOf(deleted)).group_id).toBe(id);
    expect((await groupOf(id)).deleted_by).toBe(E.id);
  });

  it("leaves the compendium's links and a coven's in place", async () => {
    const id = await seedGroup('Fixture Wards');
    await seedCategory('Testcraft Linked', id);
    const entry = await insertIngredient(
      sql,
      makeIngredient({ name: 'Testwort', nomenclature: 'none', categories: ['Testcraft Linked'] }),
      A.id,
    );
    const owned = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Testwort',
        workspaceId: WORKSPACE_W_ID,
        nomenclature: 'none',
        categories: ['Testcraft Linked'],
      }),
      A.id,
    );
    const links = () =>
      sql`select ingredient_id, category_id from ingredient_categories
          where ingredient_id in ${sql([entry, owned])} order by ingredient_id`;
    const before = await links();
    // Why the delete could have taken them: both are filed under a category in the group.
    expect(before).toHaveLength(2);

    await deleteCategoryGroup(admin, id, seededId);

    expect(await links()).toEqual(before);
  });

  it('refuses one with live categories and no group to move them to, on `moveTo`, writing nothing', async () => {
    const id = await seedGroup('Fixture Wards');
    const category = await seedCategory('Testcraft Stranded', id);

    const issues = await issuesOf(deleteCategoryGroup(admin, id));

    expect(issues).toEqual([{ path: ['moveTo'], message: expect.any(String) }]);
    expect((await groupOf(id)).deleted_at).toBeNull();
    expect((await categoryOf(category)).group_id).toBe(id);
  });

  it('refuses to move its categories to itself, to a deleted group, or to no group at all', async () => {
    const id = await seedGroup('Fixture Wards');
    await seedCategory('Testcraft Stranded', id);
    const gone = await seedGroup('Fixture Gone');
    await sql`update category_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    for (const moveTo of [id, gone, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      expect(await issuesOf(deleteCategoryGroup(admin, id, moveTo))).toEqual([
        { path: ['moveTo'], message: expect.any(String) },
      ]);
    }
    expect((await groupOf(id)).deleted_at).toBeNull();
  });

  it.each(NON_ADMINS)(
    'refuses %s and leaves the group and its categories as they were',
    async (_who, user) => {
      const id = await seedGroup('Fixture Wards');
      const category = await seedCategory('Testcraft Kept', id);
      const before = [await groupOf(id), await categoryOf(category)];

      await expect(deleteCategoryGroup(asUser(user), id, seededId)).rejects.toThrow(Forbidden);
      expect([await groupOf(id), await categoryOf(category)]).toEqual(before);
    },
  );

  it('answers NotFound for a group already deleted, for an id that names nothing, and for one that is not a uuid', async () => {
    const gone = await seedGroup('Fixture Gone');
    await sql`update category_groups set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

    for (const id of [gone, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      await expect(deleteCategoryGroup(admin, id)).rejects.toThrow(NotFound);
    }
    expect((await groupOf(gone)).deleted_by).toBe(A.id);
  });
});
