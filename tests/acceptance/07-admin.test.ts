import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { deitySlug, formSlug, slugify } from '@/lib/slugify';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import type { CompendiumIngredientInput } from '@/modules/ingredients/validation/ingredient';
import {
  createAstrologyValue,
  createCategory,
  createCategoryGroup,
  createDeity,
  createDeityTradition,
  createIngredientFormGroup,
  createIngredientFormValue,
  deleteAstrologyValue,
  deleteCategoryGroup,
  deleteDeity,
  deleteDeityTradition,
  deleteIngredientFormGroup,
  deleteCategory,
  deleteIngredientFormValue,
  updateAstrologyValue,
  updateCategory,
  updateCategoryGroup,
  updateDeity,
  updateDeityTradition,
  updateIngredientFormGroup,
  updateIngredientFormValue,
} from '@/modules/vocabulary';
import type { CategoryInput } from '@/modules/vocabulary/validation/category';
import type { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';
import { A, B, C, E, asUser } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { curatedFormId } from '../support/db/curated-ids';
import { insertIngredient } from '../support/db/insert-ingredient';
import { type IngredientFixture, makeIngredient } from '../support/fixtures';
import type { Stamps } from './types';

// Stories 17 and 18 against the compendium's writes (M5.2), the category
// vocabulary's (M5.6), the form vocabulary's (M5.6a), the planets' and the
// signs' (MB.95), the two group vocabularies' (M5.6b), and the deities' and
// their traditions' (MB.132).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/**
 * The fixture as the shared Zod input: everything but the tier and the
 * category names, its form picked from the curated row it names, as the
 * admin's form picks one (MB.167).
 */
async function inputOf(fixture: IngredientFixture): Promise<CompendiumIngredientInput> {
  const { workspaceId: _tier, categories: _categories, substitutes, deities, ...input } = fixture;
  return {
    ...input,
    formId: input.form == null ? null : await curatedFormId(sql, input.form),
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
  };
}

async function entryRow(id: string) {
  const [row] = await sql<({ name: string; workspace_id: string | null } & Stamps)[]>`
    select name, workspace_id, created_by, updated_by, updated_at, deleted_at, deleted_by
    from ingredients where id = ${id}
  `;
  return row;
}

async function categoryRow(id: string) {
  const [row] = await sql<({ name: string; slug: string; group_id: string } & Stamps)[]>`
    select name, slug, group_id, created_by, updated_by, updated_at, deleted_at, deleted_by
    from categories where id = ${id}
  `;
  return row;
}

async function formRow(id: string) {
  const [row] = await sql<({ name: string; slug: string; group_id: string } & Stamps)[]>`
    select name, slug, group_id, created_by, updated_by, updated_at, deleted_at, deleted_by
    from ingredient_forms where id = ${id}
  `;
  return row;
}

async function siteRole(userId: string): Promise<string | undefined> {
  const [row] = await sql<{ role: string }[]>`select role from users where id = ${userId}`;
  return row?.role;
}

async function membershipRole(userId: string): Promise<string | undefined> {
  const [row] = await sql<{ role: string }[]>`
    select role from workspace_members
    where workspace_id = ${WORKSPACE_W_ID} and user_id = ${userId} and deleted_at is null
  `;
  return row?.role;
}

describe('Story 17: Be prevented from editing compendium entries.', () => {
  it('refuses an update and a delete from the owner, a member and a viewer of a coven alike, and the entry stays as it was', async () => {
    const fixture = makeIngredient();
    const id = await insertIngredient(sql, fixture, E.id);
    const before = await entryRow(id);

    // Why a write could have gone through: the entry is live in the compendium
    // tier, and between them A, B and C hold every workspace role there is —
    // and no site role above `user`, which is the one thing the story turns on.
    expect(before).toMatchObject({ name: fixture.name, workspace_id: null, deleted_at: null });
    for (const [user, role] of [
      [A, 'owner'],
      [B, 'member'],
      [C, 'viewer'],
    ] as const) {
      expect(await membershipRole(user.id), `${user.name} in W`).toBe(role);
      expect(await siteRole(user.id), user.name).toBe('user');
    }

    for (const user of [A, B, C]) {
      await expect(
        updateCompendiumEntry(asUser(user), id, {
          ...(await inputOf(fixture)),
          name: 'Testwort, relabelled',
        }),
      ).rejects.toBeInstanceOf(Forbidden);
      await expect(deleteCompendiumEntry(asUser(user), id)).rejects.toBeInstanceOf(Forbidden);
    }

    // `updated_at` included: a refused write that had touched the row first
    // would have moved it, by the trigger.
    expect(await entryRow(id)).toEqual(before);
  });
});

describe('Story 18: As an admin, add, edit, and soft-delete compendium entries and categories.', () => {
  it('lets the site admin add, edit and soft-delete an entry and a category, every write stamped as the admin and the deleted rows kept', async () => {
    const admin = asUser(E);
    // Why each write could have been refused: E's row, not only the session, says admin.
    expect(await siteRole(E.id)).toBe('admin');

    const fixture = makeIngredient({ name: 'Testcap', nomenclature: 'fungal' });
    const entry = await createCompendiumEntry(admin, await inputOf(fixture));
    expect(await entryRow(entry.id)).toMatchObject({
      name: 'Testcap',
      workspace_id: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });

    await updateCompendiumEntry(admin, entry.id, {
      ...(await inputOf(fixture)),
      name: 'Testcap, relabelled',
    });
    expect(await entryRow(entry.id)).toMatchObject({
      name: 'Testcap, relabelled',
      updated_by: E.id,
    });

    await deleteCompendiumEntry(admin, entry.id);
    const deletedEntry = await entryRow(entry.id);
    expect(deletedEntry).toMatchObject({ deleted_by: E.id });
    expect(deletedEntry.deleted_at).not.toBeNull();

    const [group] = await sql<{ id: string }[]>`
      select id from category_groups where deleted_at is null order by name limit 1
    `;
    const input: CategoryInput = {
      name: 'Testcraft',
      description: 'A category this test made',
      groupId: group.id,
    };
    const category = await createCategory(admin, input);
    expect(await categoryRow(category.id)).toMatchObject({
      name: input.name,
      slug: slugify(input.name),
      group_id: group.id,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });

    await updateCategory(admin, category.id, { ...input, name: 'Testcraft, renamed' });
    expect(await categoryRow(category.id)).toMatchObject({
      name: 'Testcraft, renamed',
      updated_by: E.id,
    });

    await deleteCategory(admin, category.id);
    const deletedCategory = await categoryRow(category.id);
    expect(deletedCategory).toMatchObject({ deleted_by: E.id });
    expect(deletedCategory.deleted_at).not.toBeNull();
  });

  it('lets the site admin add, edit and soft-delete a form, its group included, every write stamped as the admin and the deleted row kept', async () => {
    const admin = asUser(E);
    expect(await siteRole(E.id)).toBe('admin');
    const groups = await sql<{ id: string; name: string }[]>`
      select id, name from ingredient_form_groups where deleted_at is null order by name limit 2
    `;
    const [first, second] = groups;
    const input: IngredientFormValueInput = {
      name: 'Fixture Shard',
      description: 'A form this test made',
      groupId: first.id,
    };

    const form = await createIngredientFormValue(admin, input);
    expect(await formRow(form.id)).toMatchObject({
      name: input.name,
      slug: formSlug(input.name, first.name),
      group_id: first.id,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });

    await updateIngredientFormValue(admin, form.id, {
      ...input,
      name: 'Fixture Shard, renamed',
      groupId: second.id,
    });
    expect(await formRow(form.id)).toMatchObject({
      name: 'Fixture Shard, renamed',
      slug: formSlug('Fixture Shard, renamed', second.name),
      group_id: second.id,
      updated_by: E.id,
    });

    await deleteIngredientFormValue(admin, form.id);
    const deletedForm = await formRow(form.id);
    expect(deletedForm).toMatchObject({ deleted_by: E.id });
    expect(deletedForm.deleted_at).not.toBeNull();
  });

  it.each([
    ['a planet', 'planets', 'planets'],
    ['a zodiac sign', 'zodiacSigns', 'zodiac_signs'],
  ] as const)(
    'lets the site admin add, edit and soft-delete %s, every write stamped as the admin and the deleted row kept',
    async (_what, field, table) => {
      const admin = asUser(E);
      expect(await siteRole(E.id)).toBe('admin');
      const rowOf = async (id: string) => {
        const [row] = await sql<({ name: string; slug: string } & Stamps)[]>`
          select name, slug, created_by, updated_by, updated_at, deleted_at, deleted_by
          from ${sql(table)} where id = ${id}
        `;
        return row;
      };

      const value = await createAstrologyValue(admin, field, {
        name: 'Fixture Body',
        description: 'A value this test made',
      });
      expect(await rowOf(value.id)).toMatchObject({
        name: 'Fixture Body',
        slug: slugify('Fixture Body'),
        created_by: E.id,
        updated_by: E.id,
        deleted_at: null,
      });

      await updateAstrologyValue(admin, field, value.id, {
        name: 'Fixture Body, renamed',
        description: 'Rewritten',
      });
      expect(await rowOf(value.id)).toMatchObject({
        name: 'Fixture Body, renamed',
        slug: slugify('Fixture Body, renamed'),
        updated_by: E.id,
      });

      await deleteAstrologyValue(admin, field, value.id);
      const deleted = await rowOf(value.id);
      expect(deleted).toMatchObject({ deleted_by: E.id });
      expect(deleted.deleted_at).not.toBeNull();
    },
  );

  it('lets the site admin add, edit and soft-delete a group of each kind, moving what it holds, every write stamped as the admin', async () => {
    const admin = asUser(E);
    expect(await siteRole(E.id)).toBe('admin');
    const [target] = await sql<{ id: string }[]>`
      select id from category_groups where deleted_at is null order by name limit 1`;
    const [substance] = await sql<{ id: string }[]>`
      select id from ingredient_form_groups where name = 'Substance' and deleted_at is null`;

    // A category group, its colours held to the floor, and a category moved off it.
    const wards = await createCategoryGroup(admin, {
      name: 'Fixture Wards',
      description: 'A group this test made',
      colorDark: '#4e8bc2',
      colorLight: '#0c5393',
    });
    await expect(
      updateCategoryGroup(admin, wards.id, {
        name: 'Fixture Wards',
        description: 'A group this test made',
        colorDark: '#0c5393',
        colorLight: '#0c5393',
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['colorDark'] }] });
    const category = await createCategory(admin, {
      name: 'Testcraft Moved',
      description: 'Filed under the group',
      groupId: wards.id,
    });
    await deleteCategoryGroup(admin, wards.id, target.id);
    const [moved] =
      await sql`select group_id, updated_by from categories where id = ${category.id}`;
    expect(moved).toEqual({ group_id: target.id, updated_by: E.id });
    const [wardsRow] =
      await sql`select deleted_by, created_by from category_groups where id = ${wards.id}`;
    expect(wardsRow).toEqual({ deleted_by: E.id, created_by: E.id });

    // A form group, renamed, its form re-slugged under the name, then moved off it.
    const matter = await createIngredientFormGroup(admin, {
      name: 'Fixture Matter',
      description: 'A group this test made',
    });
    const form = await createIngredientFormValue(admin, {
      name: 'Fixture Shard',
      description: 'Filed under the group',
      groupId: matter.id,
    });
    await updateIngredientFormGroup(admin, matter.id, {
      name: 'Fixture Stuff',
      description: 'A group this test made',
    });
    expect((await formRow(form.id)).slug).toBe(formSlug('Fixture Shard', 'Fixture Stuff'));
    await deleteIngredientFormGroup(admin, matter.id, substance.id);
    expect(await formRow(form.id)).toMatchObject({
      group_id: substance.id,
      slug: formSlug('Fixture Shard', 'Substance'),
      updated_by: E.id,
    });
    const [matterRow] =
      await sql`select deleted_by from ingredient_form_groups where id = ${matter.id}`;
    expect(matterRow.deleted_by).toBe(E.id);
  });

  it('lets the site admin add, edit and soft-delete a deity and a tradition, moving what it holds, every write stamped as the admin and the deleted rows kept', async () => {
    const admin = asUser(E);
    expect(await siteRole(E.id)).toBe('admin');
    const [greek] = await sql<{ id: string }[]>`
      select id from deity_traditions where name = 'Greek' and deleted_at is null`;
    const deityRow = async (id: string) => {
      const [row] = await sql<({ name: string; slug: string; tradition_id: string } & Stamps)[]>`
        select name, slug, tradition_id, created_by, updated_by, updated_at, deleted_at, deleted_by
        from deities where id = ${id}
      `;
      return row;
    };

    // A tradition, renamed, and a deity under it, renamed onto the entry that picked it.
    const folk = await createDeityTradition(admin, {
      name: 'Fixture Folk',
      description: 'A tradition this test made',
    });
    await updateDeityTradition(admin, folk.id, {
      name: 'Fixture Lore',
      description: 'Renamed',
    });
    const deity = await createDeity(admin, {
      name: 'Fixture Testra',
      description: 'A god this test made',
      traditionId: folk.id,
    });
    expect(await deityRow(deity.id)).toMatchObject({
      slug: deitySlug('Fixture Testra', 'Fixture Lore'),
      tradition_id: folk.id,
      created_by: E.id,
      deleted_at: null,
    });
    const entry = await insertIngredient(
      sql,
      makeIngredient({ name: 'Testwort', nomenclature: 'none' }),
      A.id,
    );
    const [link] = await sql<{ id: string }[]>`
      insert into ingredient_deities (ingredient_id, deity_id, name, position, created_by, updated_by)
      values (${entry}, ${deity.id}, 'Fixture Testra', 0, ${A.id}, ${A.id})
      returning id`;
    await updateDeity(admin, deity.id, {
      name: 'Fixture Mockra',
      description: 'Renamed',
      traditionId: folk.id,
    });
    const [renamed] =
      await sql`select name, updated_by from ingredient_deities where id = ${link.id}`;
    expect(renamed).toEqual({ name: 'Fixture Mockra', updated_by: E.id });

    // The tradition goes, its deity moved off it; the deity is held by the entry until freed.
    await deleteDeityTradition(admin, folk.id, greek.id);
    expect(await deityRow(deity.id)).toMatchObject({
      tradition_id: greek.id,
      slug: deitySlug('Fixture Mockra', 'Greek'),
      updated_by: E.id,
    });
    await expect(deleteDeity(admin, deity.id)).rejects.toThrow(Forbidden);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${entry}`;
    await deleteDeity(admin, deity.id);
    const deleted = await deityRow(deity.id);
    expect(deleted).toMatchObject({ deleted_by: E.id });
    expect(deleted.deleted_at).not.toBeNull();
    const [folkRow] = await sql`select deleted_by from deity_traditions where id = ${folk.id}`;
    expect(folkRow.deleted_by).toBe(E.id);
  });
});
