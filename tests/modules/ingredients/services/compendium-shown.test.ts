import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { setCompendiumEntryShown } from '@/modules/ingredients';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// A curator hides a compendium entry and shows it again through `setCompendiumEntryShown` alone. The table is emptied per test.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const entry = () => insertIngredient(sql, makeIngredient({ workspaceId: null }), A.id);

async function shownOf(id: string) {
  const [row] = await sql<
    { shown: boolean; updated_by: string }[]
  >`select shown, updated_by from ingredients where id = ${id}`;
  return row;
}

describe('setCompendiumEntryShown', () => {
  it.each([
    ['a curator', F],
    ['an admin', E],
  ])('lets %s hide and show an entry by direct id, stamping the actor', async (_who, user) => {
    const id = await entry();
    // Why hiding means something: the entry starts shown, last written by A.
    expect(await shownOf(id)).toEqual({ shown: true, updated_by: A.id });

    await setCompendiumEntryShown(asUser(user), id, false);
    expect(await shownOf(id)).toEqual({ shown: false, updated_by: user.id });

    await setCompendiumEntryShown(asUser(user), id, true);
    expect((await shownOf(id)).shown).toBe(true);
  });

  it.each([
    ['an owner of a coven (A)', A],
    ['a member of a coven (B)', B],
    ['a viewer of a coven (C)', C],
    ['a member of another coven (D)', D],
  ])('refuses %s by direct id', async (_who, user) => {
    const id = await entry();
    const [membership] = await sql<{ role: string }[]>`
      select role from workspace_members where user_id = ${user.id} limit 1`;
    // The precondition: the user holds a seat in a coven, so the refusal is the curator check.
    expect(membership).toBeDefined();

    await expect(setCompendiumEntryShown(asUser(user), id, false)).rejects.toBeInstanceOf(
      Forbidden,
    );
    expect((await shownOf(id)).shown).toBe(true);
  });

  it('answers NotFound for a coven own entry, and leaves it untouched', async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', canonicalName: null }),
      A.id,
    );

    await expect(setCompendiumEntryShown(asUser(F), id, false)).rejects.toBeInstanceOf(NotFound);
    expect((await shownOf(id)).shown).toBe(true);
  });

  it('answers NotFound for an id that is not one', async () => {
    await expect(setCompendiumEntryShown(asUser(F), 'not-a-uuid', false)).rejects.toBeInstanceOf(
      NotFound,
    );
  });
});
