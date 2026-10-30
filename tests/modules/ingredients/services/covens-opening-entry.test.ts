import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { covensOpeningEntry } from '@/modules/ingredients';
import { A, B, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Which of the viewer's own covens an entry's page opens in: the coven switcher keeps the viewer on the entry when it can. A live compendium entry opens in every coven; a retired one only in a coven whose cupboard still names it; a coven's own entry in that coven alone.
// The answer is per viewer and never cached (rule 6), and covers only covens the viewer belongs to (rule 5).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let live: string;
let retiredHeldByW: string;
let own: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // B belongs to X as well as W. A setup row through the raw client, once: the database outlives each test.
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${WORKSPACE_X_ID}, ${B.id}, 'member', ${A.id}, ${A.id})
    on conflict do nothing`;
  const entry = (name: string, overrides = {}) =>
    insertIngredient(
      sql,
      makeIngredient({ name, canonicalName: null, nomenclature: 'none', ...overrides }),
      E.id,
    );
  [live, retiredHeldByW, own] = await Promise.all([
    entry('Livewort'),
    entry('Retiredwort'),
    entry('Ownwort', { workspaceId: WORKSPACE_W_ID }),
  ]);
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: retiredHeldByW },
    A.id,
  );
  await sql`update ingredients set deleted_at = now() where id = ${retiredHeldByW}`;
});

/** The row as the page holds it: only what the read looks at. */
async function row(id: string) {
  const [found] = await sql<{ id: string; workspaceId: string | null; deletedAt: Date | null }[]>`
    select id, workspace_id as "workspaceId", deleted_at as "deletedAt" from ingredients where id = ${id}`;
  return found;
}

const slugsFor = async (user: Parameters<typeof asUser>[0], id: string) =>
  (await covensOpeningEntry(asUser(user), await row(id))).map(({ slug }) => slug).sort();

const slugOf = async (id: string) =>
  (await sql<{ slug: string }[]>`select slug from workspaces where id = ${id}`)[0].slug;

describe('covensOpeningEntry', () => {
  it('names every coven the viewer is in for a live compendium entry, held or not', async () => {
    // Why a coven could be left out: neither coven holds the entry.
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_compendium_entries where ingredient_id = ${live}`;
    expect(count).toBe(0);

    expect(await slugsFor(B, live)).toEqual(
      [await slugOf(WORKSPACE_W_ID), await slugOf(WORKSPACE_X_ID)].sort(),
    );
    expect(await slugsFor(A, live)).toEqual([await slugOf(WORKSPACE_W_ID)]);
  });

  it('names only the covens that still hold a retired entry', async () => {
    // Why X could be named: B reads both covens, and the entry is a compendium row.
    expect(await slugsFor(B, live)).toHaveLength(2);

    expect(await slugsFor(B, retiredHeldByW)).toEqual([await slugOf(WORKSPACE_W_ID)]);
    expect(await slugsFor(D, retiredHeldByW)).toEqual([]);
  });

  it("names a coven's own entry in that coven alone, and not in the viewer's other coven", async () => {
    // Why X could be named: B is in X and reads there.
    expect(await slugsFor(B, live)).toContain(await slugOf(WORKSPACE_X_ID));

    expect(await slugsFor(B, own)).toEqual([await slugOf(WORKSPACE_W_ID)]);
  });

  it('names no coven the viewer is not in, by direct id', async () => {
    // Why W could be named: the entry is W's own and A, in W, gets it.
    expect(await slugsFor(A, own)).toEqual([await slugOf(WORKSPACE_W_ID)]);

    expect(await slugsFor(D, own)).toEqual([]);
    expect(await slugsFor(D, retiredHeldByW)).toEqual([]);
  });

  it('gives an admin or a curator in no coven nothing', async () => {
    expect(await slugsFor(E, live)).toEqual([]);
    expect(await slugsFor(F, live)).toEqual([]);
  });
});
