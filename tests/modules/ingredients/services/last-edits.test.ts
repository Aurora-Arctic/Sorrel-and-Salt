import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { lastEditsOf } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// The latest edit a coven's card shows. The newest of the coven's live jars of the
// entry and, for the coven's own entry, the entry's row; a compendium entry's own editor, an
// admin, is never shown. The database stamps `updated_at` itself (a trigger), so each row's
// time is its write order, and every case writes in the order it names.

// The query count, observed at the repository: the names are one read whatever the page holds.
const repository = vi.hoisted(() => ({ findCoMemberNamesIncludingSoftDeleted: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCoMemberNamesIncludingSoftDeleted.mockImplementation(
    actual.findCoMemberNamesIncludingSoftDeleted,
  );
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

interface Seeded {
  id: string;
  workspaceId: string | null;
  updatedBy: string;
  updatedAt: Date;
  /** Its two forms: a coven holds one jar per form. */
  forms: [string, string];
}

/** A live ingredient row as the list hands it over, with its first form. */
async function seed(workspaceId: string | null, author: string, name: string): Promise<Seeded> {
  const id = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId,
      nomenclature: 'none',
      name,
      variants: [makeVariant(), makeVariant({ form: 'Secondform' })],
    }),
    author,
  );
  const [row] = await sql`select updated_by, updated_at from ingredients where id = ${id}`;
  return {
    id,
    workspaceId,
    updatedBy: row.updated_by as string,
    updatedAt: row.updated_at as Date,
    forms: [await variantIdOf(sql, id, 'Testform'), await variantIdOf(sql, id, 'Secondform')],
  };
}

/** The entry as it stands now: an edit after the seed moved its stamp. */
async function reread(entry: Seeded): Promise<Seeded> {
  const [row] = await sql`select updated_by, updated_at from ingredients where id = ${entry.id}`;
  return { ...entry, updatedBy: row.updated_by as string, updatedAt: row.updated_at as Date };
}

const jarOf = async (
  entry: Seeded,
  author: string,
  form: 0 | 1 = 0,
  workspaceId = WORKSPACE_W_ID,
) => {
  await sql`select pg_sleep(0.01)`;
  return insertStock(
    sql,
    {
      workspaceId,
      ingredientId: entry.id,
      variantId: entry.forms[form],
      quantityOnHand: '1',
      unit: 'g',
    },
    author,
  );
};

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  repository.findCoMemberNamesIncludingSoftDeleted.mockClear();
});

describe('lastEditsOf', () => {
  it("shows a compendium entry's newest jar's editor, never the compendium entry's", async () => {
    const entry = await seed(null, E.id, 'Compendiumwort');
    await jarOf(entry, A.id);
    await jarOf(entry, B.id, 1);
    const [newest] = await sql`
      select updated_at from inventory_items where ingredient_id = ${entry.id} and updated_by = ${B.id}`;

    // Preconditions: the compendium row's editor is E, an admin, the coven's other editors differ.
    expect(entry.updatedBy).toBe(E.id);
    expect(entry.workspaceId).toBeNull();

    const [edit] = await lastEditsOf(asUser(C), WORKSPACE_W_ID, [entry]);
    expect(edit).toEqual({ by: B.name, at: (newest.updated_at as Date).toISOString() });
  });

  it('shows a compendium entry with no jar of the coven as no edit', async () => {
    const entry = await seed(null, E.id, 'Compendiumwort');
    // Another coven's jar of it is not this coven's edit.
    await jarOf(entry, D.id, 0, WORKSPACE_X_ID);

    await expect(lastEditsOf(asUser(A), WORKSPACE_W_ID, [entry])).resolves.toEqual([null]);
  });

  it("shows the newest of a local entry's jars and the entry's own row", async () => {
    const entry = await seed(WORKSPACE_W_ID, A.id, 'Covenwort');
    await jarOf(entry, B.id);

    // The jar is newer than the entry.
    await sql`select pg_sleep(0.01)`;
    let [edit] = await lastEditsOf(asUser(A), WORKSPACE_W_ID, [entry]);
    expect(edit?.by).toBe(B.name);

    // Then the entry is edited, by A, after the jar.
    await sql`select pg_sleep(0.01)`;
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${A.id}, true)`;
      await tx`update ingredients set updated_by = ${A.id}, toxic = true where id = ${entry.id}`;
    });
    const edited = await reread(entry);
    [edit] = await lastEditsOf(asUser(A), WORKSPACE_W_ID, [edited]);
    expect(edit).toEqual({ by: A.name, at: edited.updatedAt.toISOString() });
  });

  it("shows a local entry with no jar as the entry's own editor and time", async () => {
    const entry = await seed(WORKSPACE_W_ID, B.id, 'Covenwort');
    const [{ count }] = await sql`select count(*)::int from inventory_items`;
    expect(count).toBe(0);

    await expect(lastEditsOf(asUser(A), WORKSPACE_W_ID, [entry])).resolves.toEqual([
      { by: B.name, at: entry.updatedAt.toISOString() },
    ]);
  });

  it("ignores a deleted jar, which is no longer the coven's stock", async () => {
    const entry = await seed(null, E.id, 'Compendiumwort');
    await jarOf(entry, A.id, 0);
    await sql`select pg_sleep(0.01)`;
    await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: entry.id,
        variantId: entry.forms[1],
        deleted: true,
      },
      B.id,
    );
    // Precondition: B's deleted jar is the newest row, and A's the newest live one.
    const rows = await sql`select updated_by, deleted_at from inventory_items order by updated_at`;
    expect(rows.map((row) => [row.updated_by, row.deleted_at === null])).toEqual([
      [A.id, true],
      [B.id, false],
    ]);

    const [edit] = await lastEditsOf(asUser(C), WORKSPACE_W_ID, [entry]);
    expect(edit?.by).toBe(A.name);
  });

  it("names every entry's editor with one read, however many entries", async () => {
    const entries = [
      await seed(WORKSPACE_W_ID, A.id, 'Firstwort'),
      await seed(WORKSPACE_W_ID, B.id, 'Secondwort'),
      await seed(WORKSPACE_W_ID, C.id, 'Thirdwort'),
    ];

    const edits = await lastEditsOf(asUser(A), WORKSPACE_W_ID, entries);

    expect(edits.map((edit) => edit?.by)).toEqual([A.name, B.name, C.name]);
    expect(repository.findCoMemberNamesIncludingSoftDeleted).toHaveBeenCalledTimes(1);
  });

  it('refuses a caller outside the coven, who could read the entry by its id', async () => {
    const entry = await seed(WORKSPACE_W_ID, A.id, 'Covenwort');
    await expect(sql`select 1 from ingredients where id = ${entry.id}`).resolves.toHaveLength(1);

    await expect(lastEditsOf(asUser(D), WORKSPACE_W_ID, [entry])).rejects.toBeInstanceOf(Forbidden);
    // A site admin holds no seat either.
    await expect(lastEditsOf(asUser(E), WORKSPACE_W_ID, [entry])).rejects.toBeInstanceOf(Forbidden);
  });
});
