import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { slugify } from '@/lib/slugify';
import { categoriesOf } from '@/modules/ingredients';
import {
  countCategories,
  createCategory,
  deleteCategory,
  getCategoryBySlug,
  listCategories,
  listCategoryGroups,
  updateCategory,
} from '@/modules/vocabulary';
import type { CategoryFilter } from '@/modules/vocabulary';
import type { CategoryInput } from '@/modules/vocabulary/validation/category';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Story 18's category half: the vocabulary's writes, which the site admin
// makes and nobody else does, and the reads the admin page lists them by
// (claude-docs/db/categories.md, "Category writes"). The seeded vocabulary
// stays, so every row a test writes carries a name of its own.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let groupId: string;
let otherGroupId: string;
beforeAll(async () => {
  const rows = await sql<{ id: string }[]>`
    select id from category_groups where deleted_at is null order by name, id limit 2`;
  [groupId, otherGroupId] = rows.map((row) => row.id);
});

// Every row a test writes goes, so a name one test uses is free for the next:
// the entries and their links, then the categories and groups named for it.
beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`delete from categories where name like 'Testcraft%'`;
  await sql`delete from category_groups where name like 'Fixture %'`;
});

const admin = asUser(E);

// Between them every workspace role there is, and a coven that is not W: none
// of it is the site role, which is the one thing a vocabulary write turns on.
const NON_ADMINS = [
  ['an owner of a coven', A],
  ['a member of a coven', B],
  ['a viewer in a coven', C],
  ['a member of another coven', D],
] as const;

it('is testing sessions whose site role is `user`, beside an admin', () => {
  for (const [, user] of NON_ADMINS) expect(asUser(user).role).toBe('user');
  expect(admin.role).toBe('admin');
});

function input(overrides: Partial<CategoryInput> = {}): CategoryInput {
  return { name: 'Testcraft', description: 'A category this test made', groupId, ...overrides };
}

/** Seeds a category directly, stamped by A — not through the code under test. */
async function seed(name: string, group = groupId): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into categories (name, slug, description, group_id, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded by the test', ${group}, ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

async function rowOf(id: string) {
  const [row] = await sql`select * from categories where id = ${id}`;
  return row;
}

const countNamed = async (name: string) => {
  const [row] = await sql`select count(*)::int as n from categories where name = ${name}`;
  return row.n as number;
};

/**
 * Files a fresh compendium entry, or W's own ingredient, under the category
 * named — by its label alone unless a form is given.
 */
const fileUnder = (
  category: string,
  name: string,
  workspaceId: string | null = null,
  form: string | null = null,
) =>
  insertIngredient(
    sql,
    makeIngredient({ name, workspaceId, nomenclature: 'none', form, categories: [category] }),
    A.id,
  );

describe('listCategories', () => {
  it('pages the live categories under live groups by group then name, a deleted one and an orphaned one left out', async () => {
    const deleted = await seed('Testcraft Deleted');
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;
    const [retiredGroup] = await sql<{ id: string }[]>`
      insert into category_groups (name, slug, color_dark, color_light, description, created_by, updated_by)
      values ('Fixture Retired', 'fixture-retired', '#ffffff', '#000000', 'Retired', ${A.id}, ${A.id})
      returning id`;
    const orphan = await seed('Testcraft Orphaned', retiredGroup.id);
    await sql`update category_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${retiredGroup.id}`;
    // Why either could have been listed: both rows are there, the orphan live.
    expect((await rowOf(orphan)).deleted_at).toBeNull();

    // The picker's order (MB.126): the group's name, then the category's.
    const expected = await sql<{ id: string }[]>`
      select c.id from categories c
      join category_groups g on g.id = c.group_id
      where c.deleted_at is null and g.deleted_at is null
      order by g.name, c.name, c.id`;
    const first = await resolvePage({ first: 25 }, (page) => listCategories({}, page));
    const second = await resolvePage(
      { first: 25, after: first.pageInfo.endCursor ?? undefined },
      (page) => listCategories({}, page),
    );

    const listed = [...first.edges, ...second.edges].map((edge) => edge.node.id);
    expect(listed).toEqual(expected.slice(0, 50).map((row) => row.id));
    expect(listed).not.toContain(deleted);
    expect(listed).not.toContain(orphan);
  });
});

describe('countCategories', () => {
  it("counts the rows listCategories pages, and how many come before a page's first row", async () => {
    const deleted = await seed('Testcraft Uncounted');
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from categories c
      where c.deleted_at is null
        and exists (select 1 from category_groups g where g.id = c.group_id and g.deleted_at is null)`;
    expect(n).toBeGreaterThan(25);

    const first = await resolvePage({ first: 25 }, (page) => listCategories({}, page));
    const second = await resolvePage(
      { first: 25, after: first.pageInfo.endCursor ?? undefined },
      (page) => listCategories({}, page),
    );
    const [{ cursor: startOfSecond }] = await listCategories(
      {},
      {
        after: decodeCursor(first.pageInfo.endCursor as string),
        limit: 1,
        inverted: false,
      },
    );

    await expect(countCategories({}, undefined)).resolves.toEqual({
      totalCount: n,
      countBefore: null,
    });
    await expect(countCategories({}, startOfSecond)).resolves.toEqual({
      totalCount: n,
      countBefore: 25,
    });
    expect(second.edges).toHaveLength(Math.min(25, n - 25));
  });
});

describe('listCategories and countCategories under a filter', () => {
  /** Every live category under a live group the filter reaches, by name — the list's own order. */
  const listedUnder = async (filter: CategoryFilter): Promise<string[]> => {
    const page = await resolvePage({ first: 100 }, (request) => listCategories(filter, request));
    return page.edges.map((edge) => edge.node.name);
  };

  it('narrows to the names holding the query, whatever their case', async () => {
    await seed('Testcraft Bramble Ward');
    await seed('Testcraft Thistle');

    expect(await listedUnder({ query: 'BRAMBLE' })).toEqual(['Testcraft Bramble Ward']);
    expect(await listedUnder({ query: 'craft thi' })).toEqual(['Testcraft Thistle']);
  });

  it('reads `%`, `_` and `\\` in the query literally', async () => {
    await seed('Testcraft 100% Pure');
    await seed('Testcraft 100_ Pure');
    await seed('Testcraft 100x Pure');
    await seed('Testcraft Back\\slash');
    // Why each could have been listed: read as wildcards, both patterns take all three.
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from categories
      where name ilike '%100%%' and name ilike '%100_%' and name like 'Testcraft 100%'`;
    expect(n).toBe(3);

    expect(await listedUnder({ query: '100%' })).toEqual(['Testcraft 100% Pure']);
    expect(await listedUnder({ query: '100_' })).toEqual(['Testcraft 100_ Pure']);
    expect(await listedUnder({ query: 'k\\s' })).toEqual(['Testcraft Back\\slash']);
  });

  it('reads a blank query as no query', async () => {
    const all = await listedUnder({});
    expect(all.length).toBeGreaterThan(1);

    expect(await listedUnder({ query: '   ' })).toEqual(all);
    await expect(countCategories({ query: '   ' }, undefined)).resolves.toEqual(
      await countCategories({}, undefined),
    );
  });

  it("narrows to a group's categories, alone and with a query", async () => {
    await seed('Testcraft Ours');
    await seed('Testcraft Theirs', otherGroupId);
    const inGroup = await sql<{ name: string }[]>`
      select name from categories where group_id = ${groupId} and deleted_at is null
      order by name, id`;
    // Why the other could have been listed: it is live, and the query matches it.
    expect(await listedUnder({ query: 'Testcraft' })).toEqual([
      'Testcraft Ours',
      'Testcraft Theirs',
    ]);

    expect(await listedUnder({ groupId })).toEqual(inGroup.map((row) => row.name));
    expect(await listedUnder({ groupId, query: 'testcraft' })).toEqual(['Testcraft Ours']);
    expect(await listedUnder({ groupId: otherGroupId, query: 'testcraft' })).toEqual([
      'Testcraft Theirs',
    ]);
  });

  it('answers an empty page and a zero count for a group id that is not a uuid', async () => {
    await expect(
      listCategories({ groupId: 'not-a-uuid' }, { limit: 25, inverted: false }),
    ).resolves.toEqual([]);
    await expect(countCategories({ groupId: 'not-a-uuid' }, undefined)).resolves.toEqual({
      totalCount: 0,
      countBefore: null,
    });
  });

  it('counts what the filtered page lists, and the rows before a page under it', async () => {
    await seed('Testcraft Ash Ward');
    await seed('Testcraft Elder Ward');
    await seed('Testcraft Rowan Ward');
    await seed('Testcraft Rowan Ward Elsewhere', otherGroupId);
    const filter = { query: 'ward', groupId };
    const [, second] = await listCategories(filter, { limit: 25, inverted: false });

    expect(await listedUnder(filter)).toEqual([
      'Testcraft Ash Ward',
      'Testcraft Elder Ward',
      'Testcraft Rowan Ward',
    ]);
    await expect(countCategories(filter, undefined)).resolves.toEqual({
      totalCount: 3,
      countBefore: null,
    });
    await expect(countCategories(filter, second.cursor)).resolves.toEqual({
      totalCount: 3,
      countBefore: 1,
    });
  });
});

describe('listCategoryGroups', () => {
  it('pages the live groups alphabetically by name', async () => {
    const expected = await sql<{ id: string }[]>`
      select id from category_groups where deleted_at is null order by name, id`;
    expect(expected.length).toBeGreaterThan(1);

    const page = await resolvePage({ first: 100 }, listCategoryGroups);

    expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.map((row) => row.id));
  });
});

describe('getCategoryBySlug', () => {
  it('answers the live category holding the address', async () => {
    const id = await seed('Testcraft Found');

    await expect(getCategoryBySlug('testcraft-found')).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a deleted one, and for an address nothing holds', async () => {
    const id = await seed('Testcraft Gone');
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;

    await expect(getCategoryBySlug('testcraft-gone')).rejects.toThrow(NotFound);
    await expect(getCategoryBySlug('no-such-category')).rejects.toThrow(NotFound);
  });
});

describe('createCategory', () => {
  it('lets the site admin create one, its slug from the name, stamped by them', async () => {
    const created = await createCategory(admin, input({ name: 'Testcraft Made' }));

    expect(await rowOf(created.id)).toMatchObject({
      name: 'Testcraft Made',
      slug: 'testcraft-made',
      description: 'A category this test made',
      group_id: groupId,
      seed_key: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });
  });

  it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
    await expect(createCategory(asUser(user), input())).rejects.toThrow(Forbidden);
    expect(await countNamed('Testcraft')).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(createCategory(asUser(B), input({ name: '   ' }))).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('refuses a name whose address a live category holds, on `name`, naming it', async () => {
    await seed('Testcraft Ward');

    const attempt = createCategory(admin, input({ name: 'Testcraft-Ward' }));

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      issues: [
        {
          path: ['name'],
          message:
            '"Testcraft Ward" already has the address "testcraft-ward" — choose another name',
        },
      ],
    });
    expect(await countNamed('Testcraft-Ward')).toBe(0);
  });

  it("takes a deleted category's address", async () => {
    const deleted = await seed('Testcraft Again');
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;

    const created = await createCategory(admin, input({ name: 'Testcraft Again' }));

    expect(created.slug).toBe('testcraft-again');
  });

  it('refuses a group that is retired, or that is not one, on `groupId`', async () => {
    const [retired] = await sql<{ id: string }[]>`
      insert into category_groups (name, slug, color_dark, color_light, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Gone', 'fixture-gone', '#ffffff', '#000000', 'Gone', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;

    for (const id of [retired.id, '99999999-9999-4999-8999-999999999999']) {
      const attempt = createCategory(admin, input({ groupId: id }));
      await expect(attempt).rejects.toMatchObject({
        issues: [{ path: ['groupId'], message: 'Choose a group' }],
      });
    }
    expect(await countNamed('Testcraft')).toBe(0);
  });
});

describe('updateCategory', () => {
  it('lets the site admin rewrite it, the slug following the name, created_by kept', async () => {
    const id = await seed('Testcraft Old');

    await updateCategory(admin, id, {
      name: 'Testcraft New',
      description: 'Rewritten',
      groupId: otherGroupId,
    });

    expect(await rowOf(id)).toMatchObject({
      name: 'Testcraft New',
      slug: 'testcraft-new',
      description: 'Rewritten',
      group_id: otherGroupId,
      created_by: A.id,
      updated_by: E.id,
    });
  });

  // MB.171: the seed recognises its own rows by the key, so a renamed seeded
  // row must keep it or the next deploy reinserts the original beside it.
  it("keeps a seeded row's seed key through a rename", async () => {
    const [seeded] = await sql<{ id: string; seed_key: string }[]>`
      select id, seed_key from categories
      where seed_key is not null and deleted_at is null order by name limit 1`;
    expect(seeded.seed_key).toEqual(expect.any(String));

    await updateCategory(admin, seeded.id, input({ name: 'Renamed Seed, Testcraft' }));

    expect(await rowOf(seeded.id)).toMatchObject({
      name: 'Renamed Seed, Testcraft',
      seed_key: seeded.seed_key,
    });
  });

  it('keeps its own address through a change of case', async () => {
    const id = await seed('Testcraft cased');

    await updateCategory(admin, id, input({ name: 'Testcraft Cased' }));

    expect(await rowOf(id)).toMatchObject({ name: 'Testcraft Cased', slug: 'testcraft-cased' });
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seed('Testcraft Kept');
    const before = await rowOf(id);

    await expect(updateCategory(asUser(user), id, input())).rejects.toThrow(Forbidden);
    expect(await rowOf(id)).toEqual(before);
  });

  it("refuses a rename onto another category's address, on `name`, leaving the row as it was", async () => {
    await seed('Testcraft Taken');
    const id = await seed('Testcraft Mine');
    const before = await rowOf(id);

    const attempt = updateCategory(admin, id, input({ name: 'Testcraft-Taken' }));

    await expect(attempt).rejects.toMatchObject({
      issues: [
        {
          path: ['name'],
          message:
            '"Testcraft Taken" already has the address "testcraft-taken" — choose another name',
        },
      ],
    });
    expect(await rowOf(id)).toEqual(before);
  });

  it('refuses a retired group on `groupId`, leaving the row as it was', async () => {
    const id = await seed('Testcraft Grouped');
    const before = await rowOf(id);
    const [retired] = await sql<{ id: string }[]>`
      insert into category_groups (name, slug, color_dark, color_light, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Lapsed', 'fixture-lapsed', '#ffffff', '#000000', 'Lapsed', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;

    await expect(updateCategory(admin, id, input({ groupId: retired.id }))).rejects.toMatchObject({
      issues: [{ path: ['groupId'], message: 'Choose a group' }],
    });
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for a deleted category, leaving it as it was', async () => {
    const id = await seed('Testcraft Deleted Once');
    await sql`update categories set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await rowOf(id);

    await expect(updateCategory(admin, id, input())).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      updateCategory(admin, '99999999-9999-4999-8999-999999999999', input()),
    ).rejects.toThrow(NotFound);
    await expect(updateCategory(admin, 'not-a-uuid', input())).rejects.toThrow(NotFound);
  });
});

describe('deleteCategory', () => {
  it('lets the site admin soft-delete one nothing is filed under, keeping the row', async () => {
    const id = await seed('Testcraft Unused');

    await deleteCategory(admin, id);

    const row = await rowOf(id);
    expect(row).toMatchObject({ deleted_by: E.id, created_by: A.id });
    expect(row.deleted_at).toBeInstanceOf(Date);
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seed('Testcraft Standing');
    const before = await rowOf(id);

    await expect(deleteCategory(asUser(user), id)).rejects.toThrow(Forbidden);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for a category already deleted, leaving who deleted it', async () => {
    const id = await seed('Testcraft Twice');
    await sql`update categories set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await rowOf(id);

    await expect(deleteCategory(admin, id)).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(deleteCategory(admin, '99999999-9999-4999-8999-999999999999')).rejects.toThrow(
      NotFound,
    );
    await expect(deleteCategory(admin, 'not-a-uuid')).rejects.toThrow(NotFound);
  });

  describe('while a live compendium entry is filed under it', () => {
    it('refuses, naming the entries, and the category stays live', async () => {
      const id = await seed('Testcraft Held');
      await fileUnder('Testcraft Held', 'Testwort');
      await fileUnder('Testcraft Held', 'Testcap');

      const attempt = deleteCategory(admin, id);

      await expect(attempt).rejects.toThrow(Forbidden);
      await expect(attempt).rejects.toThrow(
        '"Testcraft Held" is filed on 2 compendium entries — Testcap and Testwort. Take it off them first.',
      );
      expect((await rowOf(id)).deleted_at).toBeNull();
    });

    it('names the first three by name and counts the rest', async () => {
      const id = await seed('Testcraft Crowded');
      for (const name of ['Testa', 'Testb', 'Testc', 'Testd', 'Teste']) {
        await fileUnder('Testcraft Crowded', name);
      }

      await expect(deleteCategory(admin, id)).rejects.toThrow(
        '"Testcraft Crowded" is filed on 5 compendium entries — Testa, Testb, Testc and 2 more. Take it off them first.',
      );
    });

    it('tells two entries sharing a label apart by their forms', async () => {
      const id = await seed('Testcraft Namesakes');
      await fileUnder('Testcraft Namesakes', 'Testwort', null, 'herb');
      await fileUnder('Testcraft Namesakes', 'Testwort', null, 'root');

      // Same-named entries order by id, which is random: either order names both.
      await expect(deleteCategory(admin, id)).rejects.toThrow(
        /— Testwort \((herb|root)\) and Testwort \((?!\1)(herb|root)\)\./,
      );
    });

    it('says "it" of a single entry', async () => {
      const id = await seed('Testcraft Single');
      await fileUnder('Testcraft Single', 'Testwort');

      await expect(deleteCategory(admin, id)).rejects.toThrow(
        '"Testcraft Single" is filed on 1 compendium entry — Testwort. Take it off it first.',
      );
    });
  });

  it('is not held by a deleted compendium entry filed under it', async () => {
    const id = await seed('Testcraft Lapsed');
    const entry = await fileUnder('Testcraft Lapsed', 'Testwort');
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${entry}`;
    // Why it could have been held: the link is still there.
    const [link] = await sql`select 1 from ingredient_categories where category_id = ${id}`;
    expect(link).toBeDefined();

    await deleteCategory(admin, id);

    expect((await rowOf(id)).deleted_at).toBeInstanceOf(Date);
  });

  it("is not held by a coven's ingredient, which keeps its link and stops reading the category", async () => {
    const id = await seed('Testcraft Coven');
    const ingredient = await fileUnder('Testcraft Coven', 'Testwort', WORKSPACE_W_ID);
    const ref = { id: ingredient, workspaceId: WORKSPACE_W_ID };
    // Why it could have been held: W's ingredient reads the category to B.
    const [before] = await categoriesOf(asUser(B), [ref]);
    expect(before).toEqual([expect.objectContaining({ id })]);

    await deleteCategory(admin, id);

    expect((await rowOf(id)).deleted_at).toBeInstanceOf(Date);
    const links = await sql`select 1 from ingredient_categories where category_id = ${id}`;
    expect(links).toHaveLength(1);
    const [after] = await categoriesOf(asUser(B), [ref]);
    expect(after).toEqual([]);
  });
});
