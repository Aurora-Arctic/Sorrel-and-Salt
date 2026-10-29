import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { formSlug } from '@/lib/slugify';
import {
  countIngredientFormValues,
  createIngredientFormValue,
  deleteIngredientFormValue,
  getIngredientFormValueBySlug,
  listIngredientFormGroups,
  listIngredientFormValues,
  updateIngredientFormValue,
} from '@/modules/vocabulary';
import type { IngredientFormValueFilter } from '@/modules/vocabulary';
import type { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';
import { A, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient, insertVariant } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// Story 18's form half: the curated form vocabulary's writes, the site
// admin's alone, and the reads the admin page lists them by. A compendium
// entry's forms are its variants, each a pick, so a form a
// live entry's variant picked is held: its delete is refused, and its rename
// is carried onto every such variant, moving no address. A coven's
// pick is neither. The seeded vocabulary stays, so every form a test writes
// is named `Fixture …`.

// Two repository reads wrapped, each passing through to the real one: the
// page finder, to see what the list hands it, and the rename's clash check,
// so one test can have a clashing variant appear after the check, as a second
// admin's write would.
const repository = vi.hoisted(() => ({
  findIngredientFormValues: vi.fn(),
  findCompendiumFormRenameClashes: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findIngredientFormValues.mockImplementation(actual.findIngredientFormValues);
  repository.findCompendiumFormRenameClashes.mockImplementation(
    actual.findCompendiumFormRenameClashes,
  );
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Seeded groups by name, read once. */
let groups: Map<string, string>;
beforeAll(async () => {
  const rows = await sql<{ id: string; name: string }[]>`
    select id, name from ingredient_form_groups where deleted_at is null`;
  groups = new Map(rows.map((row) => [row.name, row.id]));
});
const group = (name: string) => groups.get(name) as string;

// Every row a test writes goes: the entries, their links and retirements,
// then the forms and groups named for this file.
beforeEach(async () => {
  repository.findIngredientFormValues.mockClear();
  await sql`truncate ingredients cascade`;
  await sql`delete from ingredient_forms where name like 'Fixture%'`;
  await sql`delete from ingredient_form_groups where name like 'Fixture %'`;
});

const admin = asUser(E);

// The site role is the one thing a vocabulary write turns on, so one non-admin
// stands for every one (claude-docs/testing/acting-as-fixture-users.md): an
// owner, whose workspace role is the highest and is still no site role.
const NON_ADMINS = [['an owner of a coven', A]] as const;
// A curator stands for both curation roles: assertSiteAdmin refuses a curator, so
// a curator's success proves the write calls assertCurator, and that an admin
// passes assertCurator is proved once in identity's site-admin tests.
const CURATORS = [['a curator', F]] as const;

function input(overrides: Partial<IngredientFormValueInput> = {}): IngredientFormValueInput {
  return {
    name: 'Fixture Shard',
    description: 'A form this test made',
    groupId: group('Substance'),
    ...overrides,
  };
}

/** Seeds a form directly under the named group, stamped by A — not through the code under test. */
async function seed(name: string, groupName = 'Substance'): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
    values (${name}, ${formSlug(name, groupName)}, 'Seeded by the test', ${group(groupName)}, ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

async function formOf(id: string) {
  const [row] = await sql`select * from ingredient_forms where id = ${id}`;
  return row;
}

async function ingredientOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

const countNamed = async (name: string) => {
  const [row] = await sql`select count(*)::int as n from ingredient_forms where name = ${name}`;
  return row.n as number;
};

const retirements = () => sql`select slug from retired_ingredient_slugs`;

/** An entry's live variants, by form. */
const variantsOf = (ingredientId: string) =>
  sql`
    select id, form, form_id, updated_by from ingredient_variants
    where ingredient_id = ${ingredientId} and deleted_at is null order by form`;

/**
 * A fresh compendium entry, or W's own ingredient, whose one form is `form`,
 * picking `formId` when given — by its label alone unless a formal name is.
 */
const entry = (
  name: string,
  form: string,
  formId: string | null,
  overrides: Parameters<typeof makeIngredient>[0] = {},
) =>
  insertIngredient(
    sql,
    makeIngredient({
      name,
      nomenclature: 'none',
      variants: [makeVariant({ form, formId })],
      ...overrides,
    }),
    A.id,
  );

/** An issue list, or the test fails because the write went through. */
async function issuesOf(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => expect.fail('the write was not refused'),
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

// Which forms are curated — a live form under a live group — is the finder's
// (tests/db/repository/vocabularies.test.ts); the service's rule is that it
// counts what its own list pages, so the list is what the count is held to.
describe('countIngredientFormValues', () => {
  it("counts the forms listIngredientFormValues pages, and how many come before a page's first row", async () => {
    const deleted = await seed('Fixture Uncounted');
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;
    const listed = await resolvePage({ first: 100 }, (page) => listIngredientFormValues({}, page));
    // The precondition: one page holds the whole list, more than a page of 25,
    // and a deleted form the count must leave out as the list does.
    expect(listed.pageInfo.hasNextPage).toBe(false);
    const n = listed.edges.length;
    expect(n).toBeGreaterThan(25);
    expect(listed.edges.map((edge) => edge.node.id)).not.toContain(deleted);

    const first = await resolvePage({ first: 25 }, (page) => listIngredientFormValues({}, page));
    const [{ cursor: startOfSecond }] = await listIngredientFormValues(
      {},
      {
        after: decodeCursor(first.pageInfo.endCursor as string),
        limit: 1,
        inverted: false,
      },
    );

    await expect(countIngredientFormValues({}, undefined)).resolves.toEqual({
      totalCount: n,
      countBefore: null,
    });
    await expect(countIngredientFormValues({}, startOfSecond)).resolves.toEqual({
      totalCount: n,
      countBefore: 25,
    });
  });
});

describe('listIngredientFormValues and countIngredientFormValues under a filter', () => {
  /** Every curated form the filter reaches, by name — the list's own order. */
  const listedUnder = async (filter: IngredientFormValueFilter): Promise<string[]> => {
    const page = await resolvePage({ first: 100 }, (request) =>
      listIngredientFormValues(filter, request),
    );
    return page.edges.map((edge) => edge.node.name);
  };

  it('narrows to the names holding the query, whatever their case', async () => {
    await seed('Fixture Bramble Shard');
    await seed('Fixture Thistle');

    expect(await listedUnder({ query: 'BRAMBLE' })).toEqual(['Fixture Bramble Shard']);
    expect(await listedUnder({ query: 'ture thi' })).toEqual(['Fixture Thistle']);
  });

  it("narrows to a group's forms, alone and with a query", async () => {
    await seed('Fixture Ours', 'Substance');
    await seed('Fixture Theirs', 'Animal');
    const inGroup = await sql<{ name: string }[]>`
      select name from ingredient_forms where group_id = ${group('Substance')} and deleted_at is null
      order by name, id`;
    // Why the other could have been listed: it is live, and the query matches it.
    expect(await listedUnder({ query: 'Fixture' })).toEqual(['Fixture Ours', 'Fixture Theirs']);

    expect(await listedUnder({ groupId: group('Substance') })).toEqual(
      inGroup.map((row) => row.name),
    );
    expect(await listedUnder({ groupId: group('Substance'), query: 'fixture' })).toEqual([
      'Fixture Ours',
    ]);
    expect(await listedUnder({ groupId: group('Animal'), query: 'fixture' })).toEqual([
      'Fixture Theirs',
    ]);
  });

  it('counts what the filtered page lists, and the rows before a page under it', async () => {
    await seed('Fixture Ash Shard');
    await seed('Fixture Elder Shard');
    await seed('Fixture Rowan Shard');
    await seed('Fixture Rowan Shard Elsewhere', 'Animal');
    const filter = { query: 'shard', groupId: group('Substance') };
    const [, second] = await listIngredientFormValues(filter, { limit: 25, inverted: false });

    expect(await listedUnder(filter)).toEqual([
      'Fixture Ash Shard',
      'Fixture Elder Shard',
      'Fixture Rowan Shard',
    ]);
    await expect(countIngredientFormValues(filter, undefined)).resolves.toEqual({
      totalCount: 3,
      countBefore: null,
    });
    await expect(countIngredientFormValues(filter, second.cursor)).resolves.toEqual({
      totalCount: 3,
      countBefore: 1,
    });
  });
});

describe('listIngredientFormGroups', () => {
  it('pages the live groups alphabetically by name, a deleted one left out', async () => {
    const [retired] = await sql<{ id: string }[]>`
      insert into ingredient_form_groups (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Retired', 'fixture-retired', 'Retired', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;
    const expected = await sql<{ id: string }[]>`
      select id from ingredient_form_groups where deleted_at is null order by name, id`;
    expect(expected.length).toBeGreaterThan(1);

    const page = await resolvePage({ first: 100 }, listIngredientFormGroups);

    const listed = page.edges.map((edge) => edge.node.id);
    expect(listed).toEqual(expected.map((row) => row.id));
    expect(listed).not.toContain(retired.id);
  });
});

describe('getIngredientFormValueBySlug', () => {
  it('answers the live form holding the address', async () => {
    const id = await seed('Fixture Found');

    await expect(getIngredientFormValueBySlug('fixture-found-substance')).resolves.toMatchObject({
      id,
    });
  });

  it('answers NotFound for a deleted one, and for an address nothing holds', async () => {
    const id = await seed('Fixture Gone');
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;

    await expect(getIngredientFormValueBySlug('fixture-gone-substance')).rejects.toThrow(NotFound);
    await expect(getIngredientFormValueBySlug('no-such-form')).rejects.toThrow(NotFound);
  });
});

describe('createIngredientFormValue', () => {
  it.each(CURATORS)(
    'lets %s create one, its slug from the name and the group, stamped by them',
    async (_who, user) => {
      const created = await createIngredientFormValue(
        asUser(user),
        input({ name: 'Fixture Made' }),
      );

      expect(await formOf(created.id)).toMatchObject({
        name: 'Fixture Made',
        slug: 'fixture-made-substance',
        description: 'A form this test made',
        group_id: group('Substance'),
        seed_key: null,
        created_by: user.id,
        updated_by: user.id,
        deleted_at: null,
      });
    },
  );

  // DESIGN.md §5: two live forms may share a name, told apart by the group.
  it('holds two forms of one name under two groups', async () => {
    const substance = await createIngredientFormValue(admin, input({ name: 'Fixture Wax' }));
    const animal = await createIngredientFormValue(
      admin,
      input({ name: 'Fixture Wax', groupId: group('Animal') }),
    );

    expect([substance.slug, animal.slug]).toEqual(['fixture-wax-substance', 'fixture-wax-animal']);
    expect(await countNamed('Fixture Wax')).toBe(2);
  });

  it.each(NON_ADMINS)(
    'refuses %s, writing nothing, and before reading the input, so a bad one earns the same refusal',
    async (_who, user) => {
      // Why it could have passed: the guard is all that refuses it. The user
      // holds no site role, and the same input is written for a curator.
      expect(asUser(user).role).toBe('user');
      expect(asUser(F).role).toBe('curator');

      await expect(createIngredientFormValue(asUser(user), input())).rejects.toThrow(Forbidden);
      expect(await countNamed('Fixture Shard')).toBe(0);
      await expect(
        createIngredientFormValue(asUser(user), input({ name: '   ' })),
      ).rejects.toBeInstanceOf(Forbidden);

      await createIngredientFormValue(asUser(F), input());
      expect(await countNamed('Fixture Shard')).toBe(1);
    },
  );

  it('refuses a name whose address a live form in the group holds, on `name`, naming it', async () => {
    await seed('Fixture Shard');

    const issues = await issuesOf(
      createIngredientFormValue(admin, input({ name: 'Fixture-Shard' })),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          '"Fixture Shard" already has the address "fixture-shard-substance" — choose another name or group',
      },
    ]);
    expect(await countNamed('Fixture-Shard')).toBe(0);
  });

  it('refuses a group that is retired, or that is not one, on `groupId`', async () => {
    const [retired] = await sql<{ id: string }[]>`
      insert into ingredient_form_groups (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Lapsed', 'fixture-lapsed', 'Lapsed', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;

    for (const groupId of [retired.id, '99999999-9999-4999-8999-999999999999']) {
      const issues = await issuesOf(createIngredientFormValue(admin, input({ groupId })));
      expect(issues).toEqual([{ path: ['groupId'], message: expect.any(String) }]);
    }
    expect(await countNamed('Fixture Shard')).toBe(0);
  });
});

describe('updateIngredientFormValue', () => {
  it.each(CURATORS)(
    'lets %s rewrite it, group included, the slug following both, created_by kept',
    async (_who, user) => {
      const id = await seed('Fixture Old');

      await updateIngredientFormValue(asUser(user), id, {
        name: 'Fixture New',
        description: 'Rewritten',
        groupId: group('Animal'),
      });

      expect(await formOf(id)).toMatchObject({
        name: 'Fixture New',
        slug: 'fixture-new-animal',
        description: 'Rewritten',
        group_id: group('Animal'),
        created_by: A.id,
        updated_by: user.id,
      });
    },
  );

  // The seed recognises its own rows by the key, so a renamed seeded
  // row must keep it or the next deploy reinserts the original beside it.
  it("keeps a seeded row's seed key through a rename", async () => {
    const [seeded] = await sql<{ id: string; seed_key: string; group_id: string }[]>`
      select id, seed_key, group_id from ingredient_forms
      where seed_key is not null and deleted_at is null order by name limit 1`;
    expect(seeded.seed_key).toEqual(expect.any(String));

    await updateIngredientFormValue(
      admin,
      seeded.id,
      input({ name: 'Fixture Renamed Seed', groupId: seeded.group_id }),
    );

    expect(await formOf(seeded.id)).toMatchObject({
      name: 'Fixture Renamed Seed',
      seed_key: seeded.seed_key,
    });
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seed('Fixture Kept');
    const before = await formOf(id);

    await expect(updateIngredientFormValue(asUser(user), id, input())).rejects.toThrow(Forbidden);
    expect(await formOf(id)).toEqual(before);
  });

  it("refuses a rename onto another form's address, on `name`, leaving the row as it was", async () => {
    await seed('Fixture Taken');
    const id = await seed('Fixture Mine');
    const before = await formOf(id);

    const issues = await issuesOf(
      updateIngredientFormValue(admin, id, input({ name: 'Fixture-Taken' })),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          '"Fixture Taken" already has the address "fixture-taken-substance" — choose another name or group',
      },
    ]);
    expect(await formOf(id)).toEqual(before);
  });

  it('refuses a move into a group whose form of the same name holds the address, on `name`', async () => {
    await seed('Fixture Wax', 'Animal');
    const id = await seed('Fixture Wax', 'Substance');

    const issues = await issuesOf(
      updateIngredientFormValue(
        admin,
        id,
        input({ name: 'Fixture Wax', groupId: group('Animal') }),
      ),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          '"Fixture Wax" already has the address "fixture-wax-animal" — choose another name or group',
      },
    ]);
  });

  it('refuses a retired group on `groupId`, leaving the row as it was', async () => {
    const id = await seed('Fixture Grouped');
    const before = await formOf(id);
    const [retired] = await sql<{ id: string }[]>`
      insert into ingredient_form_groups (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Lapsed', 'fixture-lapsed', 'Lapsed', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;

    const issues = await issuesOf(
      updateIngredientFormValue(admin, id, input({ groupId: retired.id })),
    );

    expect(issues).toEqual([{ path: ['groupId'], message: expect.any(String) }]);
    expect(await formOf(id)).toEqual(before);
  });

  it('answers NotFound for a deleted form, leaving it as it was', async () => {
    const id = await seed('Fixture Deleted Once');
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await formOf(id);

    await expect(updateIngredientFormValue(admin, id, input())).rejects.toThrow(NotFound);
    expect(await formOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      updateIngredientFormValue(admin, '99999999-9999-4999-8999-999999999999', input()),
    ).rejects.toThrow(NotFound);
    await expect(updateIngredientFormValue(admin, 'not-a-uuid', input())).rejects.toThrow(NotFound);
  });

  // MB.162 on the pick, onto the variants: the new spelling
  // is carried onto every live compendium variant that picked the form, and
  // no entry's address moves, since a form is no part of it. Which rows the
  // carry writes, stamps and leaves alone row by row is write.carryFormRename's
  // (tests/db/repository/ingredients.test.ts): what stays here is the rule —
  // which variants follow, that nothing moves an address, the refusal — and
  // that no coven's pick is an admin's to rewrite.
  describe('a rename, while live compendium entries pick the form', () => {
    it('carries the new name onto every compendium variant picking it, moving no slug and retiring none', async () => {
      const id = await seed('Fixture Resin');
      const first = await entry('Testwort', 'Fixture Resin', id);
      await insertVariant(sql, first, { form: 'Fixture Bark' }, A.id);
      // Its second form picked the resin, its first another.
      const second = await entry('Testleaf', 'Fixture Root', null, {
        nomenclature: 'botanical',
        canonicalName: 'Fixtura testalis',
      });
      await insertVariant(sql, second, { form: 'Fixture Resin', formId: id }, A.id);
      const slugs = await Promise.all(
        [first, second].map(async (at) => (await ingredientOf(at)).slug),
      );

      await updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' }));

      expect(await variantsOf(first)).toEqual([
        { id: expect.any(String), form: 'Fixture Amber', form_id: id, updated_by: E.id },
        { id: expect.any(String), form: 'Fixture Bark', form_id: null, updated_by: A.id },
      ]);
      expect(await variantsOf(second)).toEqual([
        { id: expect.any(String), form: 'Fixture Amber', form_id: id, updated_by: E.id },
        { id: expect.any(String), form: 'Fixture Root', form_id: null, updated_by: A.id },
      ]);
      expect(
        await Promise.all([first, second].map(async (at) => (await ingredientOf(at)).slug)),
      ).toEqual(slugs);
      expect(await retirements()).toEqual([]);
    });

    it('carries a change of case, the variant renamed no clash with itself', async () => {
      const id = await seed('Fixture resin');
      const picked = await entry('Testwort', 'Fixture resin', id);

      await updateIngredientFormValue(admin, id, input({ name: 'Fixture Resin' }));

      expect((await variantsOf(picked)).map((row) => row.form)).toEqual(['Fixture Resin']);
    });

    it('rewrites no variant when only the group changes', async () => {
      const id = await seed('Fixture Resin');
      const picked = await entry('Testwort', 'Fixture Resin', id);
      const before = await variantsOf(picked);

      await updateIngredientFormValue(
        admin,
        id,
        input({ name: 'Fixture Resin', groupId: group('Botanical') }),
      );

      expect((await formOf(id)).slug).toBe('fixture-resin-botanical');
      expect(await variantsOf(picked)).toEqual(before);
    });

    it("never rewrites a coven's variant that picked the form", async () => {
      const id = await seed('Fixture Resin');
      const coven = await entry('Testwort', 'Fixture Resin', id, { workspaceId: WORKSPACE_W_ID });
      const before = await variantsOf(coven);
      // Why it could have been rewritten: it picked this very form.
      expect(before.map((row) => row.form_id)).toEqual([id]);

      await updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' }));

      expect((await formOf(id)).name).toBe('Fixture Amber');
      expect(await variantsOf(coven)).toEqual(before);
    });

    it('is refused on `name`, naming the entry, when it would give an entry two forms of one name', async () => {
      const id = await seed('Fixture Resin');
      const doubled = await entry('Testwort', 'Fixture Resin', id);
      await insertVariant(sql, doubled, { form: 'fixture amber' }, A.id);
      const before = await Promise.all([formOf(id), variantsOf(doubled)]);

      const issues = await issuesOf(
        updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
      );

      expect(issues).toEqual([{ path: ['name'], message: expect.stringContaining('Testwort') }]);
      expect(await Promise.all([formOf(id), variantsOf(doubled)])).toEqual(before);
    });

    // Two admins: the check passed, and the clashing variant was written before
    // the rename's own write. The index refuses the variant's rewrite, and the
    // form's rename, written first in the same transaction, goes with it.
    it('rolls the form back with the variants when the index refuses a rewrite, naming the entry', async () => {
      const id = await seed('Fixture Resin');
      const doubled = await entry('Testwort', 'Fixture Resin', id);
      await insertVariant(sql, doubled, { form: 'Fixture Amber' }, A.id);
      const before = await Promise.all([formOf(id), variantsOf(doubled)]);
      repository.findCompendiumFormRenameClashes.mockResolvedValueOnce([]);

      const issues = await issuesOf(
        updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
      );

      expect(issues).toEqual([{ path: ['name'], message: expect.stringContaining('Testwort') }]);
      expect(await Promise.all([formOf(id), variantsOf(doubled)])).toEqual(before);
    });

    it('refuses on `name` when the index refuses a rewrite the second read cannot place, rather than surfacing the raw error', async () => {
      const id = await seed('Fixture Resin');
      const doubled = await entry('Testwort', 'Fixture Resin', id);
      await insertVariant(sql, doubled, { form: 'Fixture Amber' }, A.id);
      repository.findCompendiumFormRenameClashes
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const issues = await issuesOf(
        updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
      );

      expect(issues).toEqual([{ path: ['name'], message: expect.any(String) }]);
      expect((await formOf(id)).name).toBe('Fixture Resin');
    });
  });
});

describe('deleteIngredientFormValue', () => {
  it.each(CURATORS)(
    'lets %s soft-delete one no entry picked, keeping the row',
    async (_who, user) => {
      const id = await seed('Fixture Unused');

      await deleteIngredientFormValue(asUser(user), id);

      const row = await formOf(id);
      expect(row).toMatchObject({ deleted_by: user.id, created_by: A.id });
      expect(row.deleted_at).toBeInstanceOf(Date);
    },
  );

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seed('Fixture Standing');
    const before = await formOf(id);

    await expect(deleteIngredientFormValue(asUser(user), id)).rejects.toThrow(Forbidden);
    expect(await formOf(id)).toEqual(before);
  });

  it('answers NotFound for a form already deleted, leaving who deleted it', async () => {
    const id = await seed('Fixture Twice');
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await formOf(id);

    await expect(deleteIngredientFormValue(admin, id)).rejects.toThrow(NotFound);
    expect(await formOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      deleteIngredientFormValue(admin, '99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(NotFound);
    await expect(deleteIngredientFormValue(admin, 'not-a-uuid')).rejects.toThrow(NotFound);
  });

  describe('while a live compendium entry picks it', () => {
    it('refuses, naming the entries, and the form stays live', async () => {
      const id = await seed('Fixture Held');
      await entry('Testwort', 'Fixture Held', id);
      await entry('Testcap', 'Fixture Held', id);

      const attempt = deleteIngredientFormValue(admin, id);

      await expect(attempt).rejects.toThrow(Forbidden);
      await expect(attempt).rejects.toThrow('Testcap');
      await expect(attempt).rejects.toThrow('Testwort');
      expect((await formOf(id)).deleted_at).toBeNull();
    });
  });

  // The pick holds a form, so of two live forms called "Wax" only the
  // one an entry picked is held.
  it('deletes the same-named form that no entry picked', async () => {
    const picked = await seed('Fixture Wax', 'Substance');
    const unpicked = await seed('Fixture Wax', 'Animal');
    await entry('Testwort', 'Fixture Wax', picked);
    // Why it could have been held: an entry spells its name exactly, and its twin is held.
    await expect(deleteIngredientFormValue(admin, picked)).rejects.toThrow(Forbidden);

    await deleteIngredientFormValue(admin, unpicked);

    expect((await formOf(unpicked)).deleted_at).toBeInstanceOf(Date);
    expect((await formOf(picked)).deleted_at).toBeNull();
  });

  it('is not held by an entry that only spells it, a deleted entry that picked it, or a dropped form', async () => {
    const id = await seed('Fixture Lapsed');
    await entry('Testwort', 'Fixture Lapsed', null);
    const gone = await entry('Testleaf', 'Fixture Lapsed', id);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;
    const dropping = await entry('Testroot', 'Fixture Root', null);
    const dropped = await insertVariant(
      sql,
      dropping,
      { form: 'Fixture Lapsed', formId: id },
      A.id,
    );
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${E.id} where id = ${dropped}`;
    // Why it could have been held: the deleted entry's and the dropped form's picks are still there.
    expect((await variantsOf(gone)).map((row) => row.form_id)).toEqual([id]);
    const [pick] = await sql`select form_id from ingredient_variants where id = ${dropped}`;
    expect(pick.form_id).toBe(id);

    await deleteIngredientFormValue(admin, id);

    expect((await formOf(id)).deleted_at).toBeInstanceOf(Date);
  });

  it("is not held by a coven's ingredient that picked it, which keeps its pick", async () => {
    const id = await seed('Fixture Coven');
    const coven = await entry('Testwort', 'Fixture Coven', id, { workspaceId: WORKSPACE_W_ID });
    const before = await variantsOf(coven);
    // Why it could have been held: W's ingredient picked this very form.
    expect(before.map((row) => row.form_id)).toEqual([id]);

    await deleteIngredientFormValue(admin, id);

    expect((await formOf(id)).deleted_at).toBeInstanceOf(Date);
    expect(await variantsOf(coven)).toEqual(before);
  });
});
