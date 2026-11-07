import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { covensHoldingEntry } from '@/modules/ingredients';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Which of the viewer's own covens hold a compendium entry: the details modal's In Your Cupboards
// links. Per viewer and never cached (rule 6), and
// only covens the viewer belongs to, each read under its own Membership proof (rule 5).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let both: string;
let removed: string;
let free: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  const entry = (name: string) =>
    insertIngredient(
      sql,
      makeIngredient({ name, canonicalName: null, nomenclature: 'none' }),
      E.id,
    );
  [both, removed, free] = await Promise.all([
    entry('Bothwort'),
    entry('Removedwort'),
    entry('Freewort'),
  ]);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: both }, A.id);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: both }, D.id);
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: removed, deleted: true },
    A.id,
  );
});

async function coven(id: string) {
  const [row] = await sql<{ id: string; slug: string; name: string }[]>`
    select id, slug, name from workspaces where id = ${id}`;
  return row;
}

describe('covensHoldingEntry', () => {
  it("names the viewer's own coven that holds the entry, and leaves out one they are not in", async () => {
    // Why X could be listed: it really does hold the entry, and D, its member, reads it.
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_compendium_entries
      where ingredient_id = ${both} and workspace_id = ${WORKSPACE_X_ID} and deleted_at is null`;
    expect(count).toBe(1);
    expect(await covensHoldingEntry(asUser(D), both)).toEqual([await coven(WORKSPACE_X_ID)]);

    expect(await covensHoldingEntry(asUser(A), both)).toEqual([await coven(WORKSPACE_W_ID)]);
  });

  it('counts a viewer, who can read their coven', async () => {
    expect(await covensHoldingEntry(asUser(C), both)).toEqual([await coven(WORKSPACE_W_ID)]);
  });

  it('gives a keeper or a curator in no coven nothing, though covens hold the entry', async () => {
    // Why they could be listed: W holds it, and A reads it.
    expect(await covensHoldingEntry(asUser(A), both)).toHaveLength(1);

    expect(await covensHoldingEntry(asUser(E), both)).toEqual([]);
    expect(await covensHoldingEntry(asUser(F), both)).toEqual([]);
  });

  it('leaves out a coven whose access is paused for the viewer, and refuses nothing', async () => {
    // B belongs to X as well as W; both hold the entry. Setup rows through the raw client, removed after, as the database outlives the test.
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${WORKSPACE_X_ID}, ${B.id}, 'member', ${D.id}, ${D.id})`;
    try {
      // Why W could be named: it holds the entry, and B reads it while no pause stands.
      expect(await covensHoldingEntry(asUser(B), both)).toEqual(
        expect.arrayContaining([await coven(WORKSPACE_W_ID), await coven(WORKSPACE_X_ID)]),
      );

      await sql`
        insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${B.id}, null, ${A.id}, ${A.id})`;
      expect(await covensHoldingEntry(asUser(B), both)).toEqual([await coven(WORKSPACE_X_ID)]);
    } finally {
      await sql`delete from workspace_member_pauses where user_id = ${B.id}`;
      await sql`delete from workspace_members where workspace_id = ${WORKSPACE_X_ID} and user_id = ${B.id}`;
    }
  });

  it('leaves out a coven that removed the entry, and gives nothing for one no coven holds', async () => {
    expect(await covensHoldingEntry(asUser(A), removed)).toEqual([]);
    expect(await covensHoldingEntry(asUser(A), free)).toEqual([]);
  });
});
