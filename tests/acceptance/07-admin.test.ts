import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import type { CompendiumIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type { CategoryInput } from '@/modules/vocabulary/validation/category';
import { A, B, C, E, asUser } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient } from '../support/db/insert-ingredient';
import { type IngredientFixture, makeIngredient } from '../support/fixtures';
import type { CategoryWrites, Stamps } from './types';

// Stories 17 and 18 against the compendium's writes (M5.2) and the category
// vocabulary's (M5.6). The second do not exist yet, so they are looked up on
// the vocabulary module's surface at runtime rather than imported by name: an
// import that is not there fails typecheck instead of the test it belongs to,
// the reason 01-accounts.test.ts reads a page's source rather than rendering
// it. M5.6 replaces the lookup with the import and drops the signature stated
// for it here (claude-docs/testing.md, "Acceptance").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/**
 * `module` as `T`, once each of `names` is a function on it — failing with the
 * task that builds it, so a red story says what it is waiting on.
 */
function surface<T extends object>(
  module: object,
  names: readonly (keyof T & string)[],
  task: string,
): T {
  for (const name of names) {
    expect(
      (module as Record<string, unknown>)[name],
      `${task} has not built ${name} yet`,
    ).toBeTypeOf('function');
  }
  return module as T;
}

/** The fixture as the shared Zod input: everything but the tier and the category names. */
function inputOf(fixture: IngredientFixture): CompendiumIngredientInput {
  const { workspaceId: _tier, categories: _categories, ...input } = fixture;
  return input;
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
          ...inputOf(fixture),
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
    const categories = surface<CategoryWrites>(
      await import('@/modules/vocabulary'),
      ['createCategory', 'updateCategory', 'deleteCategory'],
      'M5.6',
    );
    const admin = asUser(E);
    // Why each write could have been refused: E's row, not only the session, says admin.
    expect(await siteRole(E.id)).toBe('admin');

    const fixture = makeIngredient({ name: 'Testcap', nomenclature: 'fungal' });
    const entry = await createCompendiumEntry(admin, inputOf(fixture));
    expect(await entryRow(entry.id)).toMatchObject({
      name: 'Testcap',
      workspace_id: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });

    await updateCompendiumEntry(admin, entry.id, {
      ...inputOf(fixture),
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
    const category = await categories.createCategory(admin, input);
    expect(await categoryRow(category.id)).toMatchObject({
      name: input.name,
      slug: slugify(input.name),
      group_id: group.id,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });

    await categories.updateCategory(admin, category.id, { ...input, name: 'Testcraft, renamed' });
    expect(await categoryRow(category.id)).toMatchObject({
      name: 'Testcraft, renamed',
      updated_by: E.id,
    });

    await categories.deleteCategory(admin, category.id);
    const deletedCategory = await categoryRow(category.id);
    expect(deletedCategory).toMatchObject({ deleted_by: E.id });
    expect(deletedCategory.deleted_at).not.toBeNull();
  });
});
