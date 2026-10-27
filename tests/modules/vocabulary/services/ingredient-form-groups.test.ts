import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { formSlug, slugify } from '@/lib/slugify';
import {
  countIngredientFormGroups,
  createIngredientFormGroup,
  deleteIngredientFormGroup,
  formChoicesOf,
  getIngredientFormGroupBySlug,
  listIngredientFormGroups,
  updateIngredientFormGroup,
} from '@/modules/vocabulary';
import { FORM_GROUP_ICONS } from '@/modules/vocabulary/schema/form-group-icons';
import type { IngredientFormGroupInput } from '@/modules/vocabulary/validation/ingredient-form-group';
import { A, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// Story 18's form-group half (M5.6b): the groups' writes, the site admin's
// alone. A form's slug is its name and its group (M5.6a), so a rename moves
// the slug of every form under the group, and a delete moves its live forms
// to the group the admin names, each re-slugged there — the forms stay
// curated, so neither a compendium entry's pick nor a coven's is orphaned
// (claude-docs/design-decisions/m5.6b-admin-groups.md). The seeded groups
// stay, so every group and form a test writes is `Fixture …`.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** A seeded group by name, the one a moved form lands in. */
let substance: { id: string; name: string };
beforeAll(async () => {
  const [row] = await sql<{ id: string; name: string }[]>`
    select id, name from ingredient_form_groups where name = 'Substance' and deleted_at is null`;
  substance = row;
});

// Every row a test writes goes: the entries, then the forms, then the groups.
beforeEach(async () => {
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

function input(overrides: Partial<IngredientFormGroupInput> = {}): IngredientFormGroupInput {
  return { name: 'Fixture Matter', description: 'A group this test made', ...overrides };
}

/** Seeds a group directly, stamped by A — not through the code under test. */
async function seedGroup(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into ingredient_form_groups (name, slug, description, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded by the test', ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

/** Seeds a form under the group, slugged as M5.6a slugs one, stamped by A. */
async function seedForm(name: string, groupId: string, groupName: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
    values (${name}, ${formSlug(name, groupName)}, 'Seeded by the test', ${groupId}, ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

async function groupOf(id: string) {
  const [row] = await sql`select * from ingredient_form_groups where id = ${id}`;
  return row;
}

async function formOf(id: string) {
  const [row] = await sql`select * from ingredient_forms where id = ${id}`;
  return row;
}

const countNamed = async (name: string) => {
  const [row] = await sql`
    select count(*)::int as n from ingredient_form_groups where name = ${name}`;
  return row.n as number;
};

/** A fresh compendium entry, or W's own ingredient, picking the form. */
const picking = (formId: string, workspaceId: string | null = null) =>
  insertIngredient(
    sql,
    makeIngredient({
      name: 'Testwort',
      workspaceId,
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Fixture Shard', formId })],
    }),
    A.id,
  );

/** An entry's row and its variants, where its form and its pick live (MB.222). */
async function ingredientOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  const variants = await sql`
    select * from ingredient_variants where ingredient_id = ${id} order by id`;
  return { ...row, variants: [...variants] };
}

/** An issue list, or the test fails because the write went through. */
async function issuesOf(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => expect.fail('the write was not refused'),
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('listIngredientFormGroups', () => {
  it('pages the live groups alphabetically by name, a deleted one left out', async () => {
    const deleted = await seedGroup('Fixture Gone');
    await sql`update ingredient_form_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;
    const expected = await sql<{ id: string }[]>`
      select id from ingredient_form_groups where deleted_at is null order by name, id`;
    expect(expected.length).toBeGreaterThan(1);

    const page = await resolvePage({ first: 100 }, listIngredientFormGroups);

    expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.map((row) => row.id));
  });
});

// "Page X of Y" on the group page: what the list pages, counted in its order.
describe('countIngredientFormGroups', () => {
  it('counts the groups listIngredientFormGroups pages, and how many come before a page’s first row', async () => {
    const first = await resolvePage({ first: 2 }, listIngredientFormGroups);
    const [{ cursor: startOfSecond }] = await listIngredientFormGroups({
      after: decodeCursor(first.pageInfo.endCursor as string),
      limit: 1,
      inverted: false,
    });
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from ingredient_form_groups where deleted_at is null`;
    // The precondition: more than one page of two.
    expect(n).toBeGreaterThan(2);

    await expect(countIngredientFormGroups(undefined)).resolves.toEqual({
      totalCount: n,
      countBefore: null,
    });
    await expect(countIngredientFormGroups(startOfSecond)).resolves.toEqual({
      totalCount: n,
      countBefore: 2,
    });
  });
});

describe('getIngredientFormGroupBySlug', () => {
  it('answers the live group holding the address', async () => {
    const id = await seedGroup('Fixture Found');

    await expect(getIngredientFormGroupBySlug('fixture-found')).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a deleted one, and for an address nothing holds', async () => {
    const id = await seedGroup('Fixture Gone');
    await sql`update ingredient_form_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;

    await expect(getIngredientFormGroupBySlug('fixture-gone')).rejects.toThrow(NotFound);
    await expect(getIngredientFormGroupBySlug('no-such-group')).rejects.toThrow(NotFound);
  });
});

describe('createIngredientFormGroup', () => {
  it.each(CURATORS)(
    'lets %s create one, its slug from the name, stamped by them',
    async (_who, user) => {
      const created = await createIngredientFormGroup(asUser(user), input());

      expect(await groupOf(created.id)).toMatchObject({
        name: 'Fixture Matter',
        slug: 'fixture-matter',
        description: 'A group this test made',
        seed_key: null,
        created_by: user.id,
        updated_by: user.id,
        deleted_at: null,
      });
    },
  );

  it.each(NON_ADMINS)(
    'refuses %s, writing nothing, and before reading the input, so a bad one earns the same refusal',
    async (_who, user) => {
      // Why it could have passed: the guard is all that refuses it. The user
      // holds no site role, and the same input is written for a curator.
      expect(asUser(user).role).toBe('user');
      expect(asUser(F).role).toBe('curator');

      await expect(createIngredientFormGroup(asUser(user), input())).rejects.toThrow(Forbidden);
      expect(await countNamed('Fixture Matter')).toBe(0);
      await expect(
        createIngredientFormGroup(asUser(user), input({ name: '  ' })),
      ).rejects.toBeInstanceOf(Forbidden);

      await createIngredientFormGroup(asUser(F), input());
      expect(await countNamed('Fixture Matter')).toBe(1);
    },
  );

  it('refuses a name whose address a live group holds, on `name`, naming it', async () => {
    await seedGroup('Fixture Matter');

    expect(
      await issuesOf(createIngredientFormGroup(admin, input({ name: 'Fixture-Matter' }))),
    ).toEqual([
      {
        path: ['name'],
        message: expect.stringContaining('Fixture Matter'),
      },
    ]);
    expect(await countNamed('Fixture-Matter')).toBe(0);
  });
});

describe('updateIngredientFormGroup', () => {
  it.each(CURATORS)(
    'lets %s rewrite it, the slug following the name, created_by kept',
    async (_who, user) => {
      const id = await seedGroup('Fixture Matter');

      await updateIngredientFormGroup(asUser(user), id, input({ name: 'Fixture Stuff' }));

      expect(await groupOf(id)).toMatchObject({
        name: 'Fixture Stuff',
        slug: 'fixture-stuff',
        created_by: A.id,
        updated_by: user.id,
      });
    },
  );

  // A form's slug names its group (M5.6a), so it follows the group's rename.
  it('moves the slug of every live form under it, in the same write, and touches no ingredient', async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
    const flake = await seedForm('Fixture Flake', id, 'Fixture Matter');
    const deleted = await seedForm('Fixture Deleted', id, 'Fixture Matter');
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;
    const entry = await picking(shard);
    const before = await ingredientOf(entry);

    await updateIngredientFormGroup(admin, id, input({ name: 'Fixture Stuff' }));

    expect(await formOf(shard)).toMatchObject({
      slug: 'fixture-shard-fixture-stuff',
      updated_by: E.id,
    });
    expect((await formOf(flake)).slug).toBe('fixture-flake-fixture-stuff');
    expect((await formOf(deleted)).slug).toBe('fixture-deleted-fixture-matter');
    expect(await ingredientOf(entry)).toEqual(before);
  });

  it("leaves its forms' slugs alone when the name stays", async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
    const before = await formOf(shard);

    await updateIngredientFormGroup(admin, id, input({ description: 'Redescribed' }));

    expect(await formOf(shard)).toEqual(before);
  });

  it("refuses a rename that would move a form onto another form's address, on `name`, writing nothing", async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
    const odd = await seedGroup('Fixture Odd');
    await seedForm('Fixture Shard Fixture', odd, 'Fixture Odd');
    // Why the rename could have gone through: no group holds its address.
    expect(await countNamed('Fixture Fixture Odd')).toBe(0);

    expect(
      await issuesOf(updateIngredientFormGroup(admin, id, input({ name: 'Fixture Fixture Odd' }))),
    ).toEqual([
      {
        path: ['name'],
        message:
          'Renaming the group would move "Fixture Shard" to the address "fixture-shard-fixture-fixture-odd", which "Fixture Shard Fixture" already has — rename one of them first',
      },
    ]);
    expect((await groupOf(id)).name).toBe('Fixture Matter');
    expect((await formOf(shard)).slug).toBe('fixture-shard-fixture-matter');
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seedGroup('Fixture Matter');
    const before = await groupOf(id);

    await expect(
      updateIngredientFormGroup(asUser(user), id, input({ name: 'Fixture Stuff' })),
    ).rejects.toThrow(Forbidden);
    expect(await groupOf(id)).toEqual(before);
  });

  it('answers NotFound for a deleted group, for an id that names nothing, and for one that is not a uuid', async () => {
    const gone = await seedGroup('Fixture Gone');
    await sql`update ingredient_form_groups set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    for (const id of [gone, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      await expect(updateIngredientFormGroup(admin, id, input())).rejects.toThrow(NotFound);
    }
  });
});

// The icon standing for the group (M12.6): one of the six, or NULL for the
// generic. An update rewrites the group whole, so an input without one clears
// it — the only way GraphQL's `icon: null` reaches the service, as absent.
describe('the icon', () => {
  const expired = vi.mocked(revalidateTag);
  beforeEach(() => expired.mockClear());

  const iconOf = async (id: string) => (await groupOf(id)).icon as string | null;

  it('is written as given by a create and by an update, each of the six and none, and cleared by an update that carries none, expiring the compendium', async () => {
    for (const icon of [...FORM_GROUP_ICONS, null]) {
      const created = await createIngredientFormGroup(
        admin,
        input({ name: `Fixture ${icon ?? 'Generic'}`, icon }),
      );

      expect(await iconOf(created.id), String(icon)).toBe(icon);
    }
    expect(expired.mock.calls).toEqual(
      Array.from({ length: FORM_GROUP_ICONS.length + 1 }, () => [COMPENDIUM_TAG, { expire: 0 }]),
    );
    expired.mockClear();

    const id = await seedGroup('Fixture Matter');
    for (const icon of [...FORM_GROUP_ICONS, null]) {
      await updateIngredientFormGroup(admin, id, input({ icon }));

      expect(await iconOf(id), String(icon)).toBe(icon);
    }
    expect(expired).toHaveBeenCalledTimes(FORM_GROUP_ICONS.length + 1);

    await sql`update ingredient_form_groups set icon = 'curio' where id = ${id}`;
    await updateIngredientFormGroup(admin, id, input());
    expect(await iconOf(id)).toBeNull();
  });

  it('refuses any other value on `icon`, writing nothing and expiring nothing', async () => {
    const id = await seedGroup('Fixture Kept');
    await sql`update ingredient_form_groups set icon = 'curio' where id = ${id}`;
    const before = await groupOf(id);
    const bad = { icon: 'banana' } as unknown as Partial<IngredientFormGroupInput>;

    expect(await issuesOf(createIngredientFormGroup(admin, input(bad)))).toEqual([
      { path: ['icon'], message: expect.any(String) },
    ]);
    expect(await issuesOf(updateIngredientFormGroup(admin, id, input(bad)))).toEqual([
      { path: ['icon'], message: expect.any(String) },
    ]);
    expect(await countNamed('Fixture Matter')).toBe(0);
    expect(await groupOf(id)).toEqual(before);
    expect(expired).not.toHaveBeenCalled();
  });
});

describe('deleteIngredientFormGroup', () => {
  it.each(CURATORS)(
    'lets %s soft-delete one with no forms, keeping the row',
    async (_who, user) => {
      const id = await seedGroup('Fixture Matter');

      await deleteIngredientFormGroup(asUser(user), id);

      expect(await groupOf(id)).toMatchObject({
        deleted_by: user.id,
        deleted_at: expect.any(Date),
      });
    },
  );

  it('moves its live forms to the group named, re-slugged there, then deletes it', async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
    const flake = await seedForm('Fixture Flake', id, 'Fixture Matter');

    await deleteIngredientFormGroup(admin, id, substance.id);

    expect(await formOf(shard)).toMatchObject({
      group_id: substance.id,
      slug: formSlug('Fixture Shard', substance.name),
      updated_by: E.id,
      deleted_at: null,
    });
    expect(await formOf(flake)).toMatchObject({
      group_id: substance.id,
      slug: 'fixture-flake-substance',
    });
    expect((await groupOf(id)).deleted_by).toBe(E.id);
  });

  // The forms stay curated, so nothing a compendium entry or a coven picked is orphaned.
  it("is not refused by a compendium entry's pick, and leaves every pick curated and every ingredient as it was", async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
    const entry = await picking(shard);
    const owned = await picking(shard, WORKSPACE_W_ID);
    const before = [await ingredientOf(entry), await ingredientOf(owned)];
    // Why either could have held the delete: both are live and pick the form.
    expect(before.map((row) => row.variants.map((variant) => variant.form_id))).toEqual([
      [shard],
      [shard],
    ]);

    await deleteIngredientFormGroup(admin, id, substance.id);

    expect([await ingredientOf(entry), await ingredientOf(owned)]).toEqual(before);
    const [choice] = await formChoicesOf([shard]);
    expect(choice).toMatchObject({ id: shard, groupId: substance.id });
  });

  it("refuses a move onto a same-named form's address, on `moveTo`, writing nothing", async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
    await seedForm('Fixture Shard', substance.id, substance.name);

    expect(await issuesOf(deleteIngredientFormGroup(admin, id, substance.id))).toEqual([
      {
        path: ['moveTo'],
        message:
          'Moving "Fixture Shard" would give it the address "fixture-shard-substance", which "Fixture Shard" already has — rename one of them first',
      },
    ]);
    expect((await groupOf(id)).deleted_at).toBeNull();
    expect((await formOf(shard)).group_id).toBe(id);
  });

  it.each(NON_ADMINS)(
    'refuses %s and leaves the group and its forms as they were',
    async (_who, user) => {
      const id = await seedGroup('Fixture Matter');
      const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');
      const before = [await groupOf(id), await formOf(shard)];

      await expect(deleteIngredientFormGroup(asUser(user), id, substance.id)).rejects.toThrow(
        Forbidden,
      );
      expect([await groupOf(id), await formOf(shard)]).toEqual(before);
    },
  );

  it('answers NotFound for a group already deleted, for an id that names nothing, and for one that is not a uuid', async () => {
    const gone = await seedGroup('Fixture Gone');
    await sql`update ingredient_form_groups set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

    for (const id of [gone, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      await expect(deleteIngredientFormGroup(admin, id)).rejects.toThrow(NotFound);
    }
    expect((await groupOf(gone)).deleted_by).toBe(A.id);
  });
});
