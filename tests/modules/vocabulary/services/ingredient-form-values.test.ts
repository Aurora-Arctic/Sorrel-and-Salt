import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Story 18's form half (M5.6a): the curated form vocabulary's writes, the site
// admin's alone, and the reads the admin page lists them by. A compendium
// entry's form is a pick (MB.167), so a form a live entry picked is held: its
// delete is refused, and its rename is carried onto the entry — re-keyed and
// re-slugged, the old slug retired (MB.82). A coven's pick is neither. The
// seeded vocabulary stays, so every form a test writes is named `Fixture …`.

// Two repository reads wrapped, each passing through to the real one: the
// page finder, to see what the list hands it, and the identity lookup, so one
// test can have a colliding entry appear after the check, as a second admin's
// write would.
const repository = vi.hoisted(() => ({
  findIngredientFormValues: vi.fn(),
  findCompendiumEntryByIdentity: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findIngredientFormValues.mockImplementation(actual.findIngredientFormValues);
  repository.findCompendiumEntryByIdentity.mockImplementation(actual.findCompendiumEntryByIdentity);
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

const retirements = () =>
  sql`
    select ingredient_id, workspace_id, slug, retired_at, created_by
    from retired_ingredient_slugs order by slug`;

/**
 * A fresh compendium entry, or W's own ingredient, holding `form` as its text
 * and picking `formId` when given — by its label alone unless a formal name is.
 */
const entry = (
  name: string,
  form: string,
  formId: string | null,
  overrides: Parameters<typeof makeIngredient>[0] = {},
) =>
  insertIngredient(
    sql,
    makeIngredient({ name, nomenclature: 'none', form, formId, ...overrides }),
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

describe('listIngredientFormValues', () => {
  it('hands the page request to the finder unchanged and answers its page', async () => {
    const page: PageRequest = { limit: 26, inverted: false };

    const entries = await listIngredientFormValues({}, page);

    expect(repository.findIngredientFormValues).toHaveBeenCalledWith({}, page);
    // The seed's first page: the request's limit is the page plus one.
    expect(entries).toHaveLength(26);
    expect(entries[0].node).toMatchObject({
      name: expect.any(String),
      groupId: expect.any(String),
    });
  });
});

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

  it('reads `%`, `_` and `\\` in the query literally', async () => {
    await seed('Fixture 100% Pure');
    await seed('Fixture 100_ Pure');
    await seed('Fixture 100x Pure');
    await seed('Fixture Back\\slash');
    // Why each could have been listed: read as wildcards, both patterns take all three.
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from ingredient_forms
      where name ilike '%100%%' and name ilike '%100_%' and name like 'Fixture 100%'`;
    expect(n).toBe(3);

    expect(await listedUnder({ query: '100%' })).toEqual(['Fixture 100% Pure']);
    expect(await listedUnder({ query: '100_' })).toEqual(['Fixture 100_ Pure']);
    expect(await listedUnder({ query: 'k\\s' })).toEqual(['Fixture Back\\slash']);
  });

  it('reads a blank query as no query', async () => {
    const all = await listedUnder({});
    expect(all.length).toBeGreaterThan(1);

    expect(await listedUnder({ query: '   ' })).toEqual(all);
    await expect(countIngredientFormValues({ query: '   ' }, undefined)).resolves.toEqual(
      await countIngredientFormValues({}, undefined),
    );
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

  it('answers an empty page and a zero count for a group id that is not a uuid, reading nothing', async () => {
    await expect(
      listIngredientFormValues({ groupId: 'not-a-uuid' }, { limit: 25, inverted: false }),
    ).resolves.toEqual([]);
    await expect(countIngredientFormValues({ groupId: 'not-a-uuid' }, undefined)).resolves.toEqual({
      totalCount: 0,
      countBefore: null,
    });
    expect(repository.findIngredientFormValues).not.toHaveBeenCalled();
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
  it('lets the site admin create one, its slug from the name and the group, stamped by them', async () => {
    const created = await createIngredientFormValue(admin, input({ name: 'Fixture Made' }));

    expect(await formOf(created.id)).toMatchObject({
      name: 'Fixture Made',
      slug: 'fixture-made-substance',
      description: 'A form this test made',
      group_id: group('Substance'),
      seed_key: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });
  });

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

  it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
    await expect(createIngredientFormValue(asUser(user), input())).rejects.toThrow(Forbidden);
    expect(await countNamed('Fixture Shard')).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(
      createIngredientFormValue(asUser(A), input({ name: '   ' })),
    ).rejects.toBeInstanceOf(Forbidden);
  });

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

  it("takes a deleted form's address", async () => {
    const deleted = await seed('Fixture Again');
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;

    const created = await createIngredientFormValue(admin, input({ name: 'Fixture Again' }));

    expect(created.slug).toBe('fixture-again-substance');
  });

  it('refuses a group that is retired, or that is not one, on `groupId`', async () => {
    const [retired] = await sql<{ id: string }[]>`
      insert into ingredient_form_groups (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Lapsed', 'fixture-lapsed', 'Lapsed', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;

    for (const groupId of [retired.id, '99999999-9999-4999-8999-999999999999']) {
      const issues = await issuesOf(createIngredientFormValue(admin, input({ groupId })));
      expect(issues).toEqual([{ path: ['groupId'], message: 'Choose a group' }]);
    }
    expect(await countNamed('Fixture Shard')).toBe(0);
  });
});

describe('updateIngredientFormValue', () => {
  it('lets the site admin rewrite it, group included, the slug following both, created_by kept', async () => {
    const id = await seed('Fixture Old');

    await updateIngredientFormValue(admin, id, {
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
      updated_by: E.id,
    });
  });

  // MB.171: the seed recognises its own rows by the key, so a renamed seeded
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

    expect(issues).toEqual([{ path: ['groupId'], message: 'Choose a group' }]);
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

  // MB.162 on the pick (MB.167): a form is identity, so its new spelling is
  // carried onto every live compendium entry that picked it, re-keyed and
  // re-slugged as any compendium update would (MB.82). The clock is pinned,
  // so the retirement's instant is exact. Which entries pick the form is
  // findCompendiumPage's formId filter (tests/db/repository/ingredients.test.ts),
  // and what the carry writes, stamps and leaves alone row by row is
  // write.carryFormRename's (tests/db/repository/slugs.test.ts): what stays here
  // is the rule — the slug each entry moves to, when nothing moves, the
  // refusals — and that no coven's pick is an admin's to rewrite (M6.6).
  describe('a rename, while live compendium entries pick the form', () => {
    const NOW = new Date('2026-03-01T12:00:00.000Z');

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('rewrites each one in the same write: its form, its key and its slug, the old slug retired', async () => {
      const id = await seed('Fixture Resin');
      const first = await entry('Testwort', 'Fixture Resin', id);
      const second = await entry('Testleaf', 'Fixture Resin', id, {
        nomenclature: 'botanical',
        canonicalName: 'Fixtura testalis',
      });
      // The preconditions: both picked the form, under the old spelling.
      expect(await ingredientOf(first)).toMatchObject({
        form_id: id,
        slug: 'testwort-fixture-resin',
        canonical_key: 'testwort :: fixture resin',
      });

      await updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' }));

      expect(await ingredientOf(first)).toMatchObject({
        form: 'Fixture Amber',
        form_id: id,
        canonical_key: 'testwort :: fixture amber',
        slug: 'testwort-fixture-amber',
        created_by: A.id,
        updated_by: E.id,
      });
      expect(await ingredientOf(second)).toMatchObject({
        form: 'Fixture Amber',
        canonical_key: 'fixtura testalis :: fixture amber',
        slug: 'testleaf-fixture-amber-fixtura-testalis',
      });
      expect(await retirements()).toEqual([
        {
          ingredient_id: second,
          workspace_id: null,
          slug: 'testleaf-fixture-resin-fixtura-testalis',
          retired_at: NOW,
          created_by: E.id,
        },
        {
          ingredient_id: first,
          workspace_id: null,
          slug: 'testwort-fixture-resin',
          retired_at: NOW,
          created_by: E.id,
        },
      ]);
    });

    it('rewrites the text alone, moving no slug, on a change of case', async () => {
      const id = await seed('Fixture resin');
      const picked = await entry('Testwort', 'Fixture resin', id);

      await updateIngredientFormValue(admin, id, input({ name: 'Fixture Resin' }));

      expect(await ingredientOf(picked)).toMatchObject({
        form: 'Fixture Resin',
        slug: 'testwort-fixture-resin',
      });
      expect(await retirements()).toEqual([]);
    });

    it('rewrites no entry when only the group changes', async () => {
      const id = await seed('Fixture Resin');
      const picked = await entry('Testwort', 'Fixture Resin', id);
      const before = await ingredientOf(picked);

      await updateIngredientFormValue(
        admin,
        id,
        input({ name: 'Fixture Resin', groupId: group('Botanical') }),
      );

      expect((await formOf(id)).slug).toBe('fixture-resin-botanical');
      expect(await ingredientOf(picked)).toEqual(before);
      expect(await retirements()).toEqual([]);
    });

    it("never rewrites a coven's ingredient that picked the form", async () => {
      const id = await seed('Fixture Resin');
      const coven = await entry('Testwort', 'Fixture Resin', id, { workspaceId: WORKSPACE_W_ID });
      const before = await ingredientOf(coven);
      // Why it could have been rewritten: it picked this very form.
      expect(before).toMatchObject({ form_id: id, workspace_id: WORKSPACE_W_ID });

      await updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' }));

      expect((await formOf(id)).name).toBe('Fixture Amber');
      expect(await ingredientOf(coven)).toEqual(before);
      expect(await retirements()).toEqual([]);
    });

    it('is refused, naming both, when an entry would become another live entry, and nothing is written', async () => {
      const id = await seed('Fixture Resin');
      const amber = await seed('Fixture Amber', 'Animal');
      const renamed = await entry('Testwort', 'Fixture Resin', id);
      const holder = await entry('Testwort', 'Fixture Amber', amber);
      const before = await Promise.all([formOf(id), ingredientOf(renamed), ingredientOf(holder)]);

      const issues = await issuesOf(
        updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
      );

      expect(issues).toEqual([
        {
          path: ['name'],
          message:
            'Renaming "Fixture Resin" to "Fixture Amber" would make Testwort (Fixture Resin) the same entry as Testwort (Fixture Amber) — change one of them first',
        },
      ]);
      expect(await Promise.all([formOf(id), ingredientOf(renamed), ingredientOf(holder)])).toEqual(
        before,
      );
      expect(await retirements()).toEqual([]);
    });

    it('is refused, naming both, when an entry would move onto a live entry’s address', async () => {
      const id = await seed('Fixture Resin');
      const renamed = await entry('Testwort', 'Fixture Resin', id);
      // A typed form folding to the same address but not the same identity.
      const holder = await entry('Testwort', 'Fixture-Amber', null);
      expect((await ingredientOf(holder)).slug).toBe('testwort-fixture-amber');
      const before = await Promise.all([formOf(id), ingredientOf(renamed)]);

      const issues = await issuesOf(
        updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
      );

      expect(issues).toEqual([
        {
          path: ['name'],
          message:
            'Renaming "Fixture Resin" to "Fixture Amber" would move Testwort (Fixture Resin) to the address "testwort-fixture-amber", which Testwort (Fixture-Amber) already has — change one of them first',
        },
      ]);
      expect(await Promise.all([formOf(id), ingredientOf(renamed)])).toEqual(before);
    });

    // Two admins: the check passed, and the colliding entry was written before
    // the rename's own write. The index refuses the entry's rewrite, and the
    // form's rename, written first in the same transaction, goes with it.
    it('rolls the form back with the entries when the index refuses a rewrite, naming both', async () => {
      const id = await seed('Fixture Resin');
      const amber = await seed('Fixture Amber', 'Animal');
      const renamed = await entry('Testwort', 'Fixture Resin', id);
      // The identity alone, at another address, so only the identity index can refuse.
      const holder = await entry('Testbane', 'Fixture Amber', amber, {
        nomenclature: 'unknown',
        canonicalName: 'Testwort',
      });
      expect(await ingredientOf(holder)).toMatchObject({
        canonical_key: 'testwort :: fixture amber',
        slug: 'testbane-fixture-amber-testwort',
      });
      const before = await Promise.all([formOf(id), ingredientOf(renamed)]);
      repository.findCompendiumEntryByIdentity.mockResolvedValueOnce(undefined);

      const issues = await issuesOf(
        updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
      );

      expect(issues).toEqual([
        {
          path: ['name'],
          message:
            'Renaming "Fixture Resin" to "Fixture Amber" would make Testwort (Fixture Resin) the same entry as Testbane (Testwort, Fixture Amber) — change one of them first',
        },
      ]);
      expect(await Promise.all([formOf(id), ingredientOf(renamed)])).toEqual(before);
      expect(await retirements()).toEqual([]);
    });

    describe('onto an address another entry moved off, inside its window', () => {
      let moved: string;

      beforeEach(async () => {
        moved = await entry('Testsoil', 'Fixture Earth', null);
        await sql`
          insert into retired_ingredient_slugs ${sql({
            ingredient_id: moved,
            workspace_id: null,
            slug: 'testwort-fixture-amber',
            retired_at: NOW,
            created_by: E.id,
            updated_by: E.id,
          })}`;
      });

      it('is refused on `endRedirect`, naming the entry and when its window closes, and nothing is written', async () => {
        const id = await seed('Fixture Resin');
        const renamed = await entry('Testwort', 'Fixture Resin', id);
        const before = await Promise.all([formOf(id), ingredientOf(renamed)]);

        const issues = await issuesOf(
          updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
        );

        expect(issues).toEqual([
          {
            path: ['endRedirect'],
            message:
              '"testwort-fixture-amber" redirects to Testsoil (Fixture Earth) until 28 August 2026, 00:00 UTC — confirm to end that redirect',
          },
        ]);
        expect(await Promise.all([formOf(id), ingredientOf(renamed)])).toEqual(before);
      });

      it('names every entry whose redirect it would end', async () => {
        const id = await seed('Fixture Resin');
        await entry('Testwort', 'Fixture Resin', id);
        await entry('Testleaf', 'Fixture Resin', id);
        await sql`
          insert into retired_ingredient_slugs ${sql({
            ingredient_id: moved,
            workspace_id: null,
            slug: 'testleaf-fixture-amber',
            retired_at: NOW,
            created_by: E.id,
            updated_by: E.id,
          })}`;

        const issues = await issuesOf(
          updateIngredientFormValue(admin, id, input({ name: 'Fixture Amber' })),
        );

        expect(issues).toEqual([
          {
            path: ['endRedirect'],
            message:
              '"testleaf-fixture-amber" redirects to Testsoil (Fixture Earth) until 28 August 2026, 00:00 UTC and "testwort-fixture-amber" redirects to Testsoil (Fixture Earth) until 28 August 2026, 00:00 UTC — confirm to end those redirects',
          },
        ]);
      });

      it('goes through once the admin confirms', async () => {
        const id = await seed('Fixture Resin');
        const renamed = await entry('Testwort', 'Fixture Resin', id);

        await updateIngredientFormValue(
          admin,
          id,
          input({ name: 'Fixture Amber', endRedirect: true }),
        );

        expect(await ingredientOf(renamed)).toMatchObject({
          form: 'Fixture Amber',
          slug: 'testwort-fixture-amber',
        });
      });
    });
  });
});

describe('deleteIngredientFormValue', () => {
  it('lets the site admin soft-delete one no entry picked, keeping the row', async () => {
    const id = await seed('Fixture Unused');

    await deleteIngredientFormValue(admin, id);

    const row = await formOf(id);
    expect(row).toMatchObject({ deleted_by: E.id, created_by: A.id });
    expect(row.deleted_at).toBeInstanceOf(Date);
  });

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
      await expect(attempt).rejects.toThrow(
        '"Fixture Held" is the form of 2 compendium entries — Testcap (Fixture Held) and Testwort (Fixture Held). Change their form first.',
      );
      expect((await formOf(id)).deleted_at).toBeNull();
    });

    it('names the first three and counts the rest', async () => {
      const id = await seed('Fixture Crowded');
      for (const name of ['Testa', 'Testb', 'Testc', 'Testd', 'Teste']) {
        await entry(name, 'Fixture Crowded', id);
      }

      await expect(deleteIngredientFormValue(admin, id)).rejects.toThrow(
        '"Fixture Crowded" is the form of 5 compendium entries — Testa (Fixture Crowded), Testb (Fixture Crowded), Testc (Fixture Crowded) and 2 more. Change their form first.',
      );
    });

    it('says "its" of a single entry', async () => {
      const id = await seed('Fixture Single');
      await entry('Testwort', 'Fixture Single', id);

      await expect(deleteIngredientFormValue(admin, id)).rejects.toThrow(
        '"Fixture Single" is the form of 1 compendium entry — Testwort (Fixture Single). Change its form first.',
      );
    });
  });

  // MB.167: the pick holds a form, so of two live forms called "Wax" only the
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

  it('is not held by an entry that only spells it, nor by a deleted entry that picked it', async () => {
    const id = await seed('Fixture Lapsed');
    await entry('Testwort', 'Fixture Lapsed', null);
    const gone = await entry('Testleaf', 'Fixture Lapsed', id);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;
    // Why it could have been held: the deleted entry's pick is still there.
    expect((await ingredientOf(gone)).form_id).toBe(id);

    await deleteIngredientFormValue(admin, id);

    expect((await formOf(id)).deleted_at).toBeInstanceOf(Date);
  });

  it("is not held by a coven's ingredient that picked it, which keeps its pick", async () => {
    const id = await seed('Fixture Coven');
    const coven = await entry('Testwort', 'Fixture Coven', id, { workspaceId: WORKSPACE_W_ID });
    const before = await ingredientOf(coven);
    // Why it could have been held: W's ingredient picked this very form.
    expect(before).toMatchObject({ form_id: id, workspace_id: WORKSPACE_W_ID });

    await deleteIngredientFormValue(admin, id);

    expect((await formOf(id)).deleted_at).toBeInstanceOf(Date);
    expect(await ingredientOf(coven)).toEqual(before);
  });
});
