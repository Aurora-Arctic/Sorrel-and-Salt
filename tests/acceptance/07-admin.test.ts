import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { formSlug, slugify } from '@/lib/slugify';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import type { CompendiumIngredientInput } from '@/modules/ingredients/validation/ingredient';
import {
  createAstrologyValue,
  createCategory,
  createIngredientFormValue,
  deleteAstrologyValue,
  deleteCategory,
  deleteIngredientFormValue,
  updateAstrologyValue,
  updateCategory,
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
// vocabulary's (M5.6), the form vocabulary's (M5.6a) and the planets' and
// the signs' (MB.95).

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
});
