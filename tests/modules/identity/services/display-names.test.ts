import { beforeAll, describe, expect, it } from 'vitest';
import { displayNamesOf } from '@/modules/identity';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

useRawClient();

// The display name a member may read, gated to co-members — anyone
// who holds or has held a seat in a coven the viewer sits in now. Every case
// is a direct id, so a refusal is a null in its own slot rather than a row
// missing from a list (claude-docs/auth/display-names.md, "Display names").

// Invented accounts beside the cast, each seated by this file: F leaves W, G
// joins W and is then deleted, and H shares only Y, which is deleted.
const F = { id: '00000000-0000-0000-0000-000000000a01', name: 'Fixture Leaver' };
const G = { id: '00000000-0000-0000-0000-000000000a02', name: 'Fixture Departed' };
const H = { id: '00000000-0000-0000-0000-000000000a03', name: 'Fixture Lapsed' };

async function insertUser({ id, name }: { id: string; name: string }) {
  await sql`
    insert into users (id, name, email, created_by, updated_by)
    values (${id}, ${name}, ${`${id}@users.test`}, ${id}, ${id})`;
}

async function seat(workspaceId: string, userId: string) {
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${workspaceId}, ${userId}, 'member', ${A.id}, ${A.id})`;
}

let covenY: string;

beforeAll(async () => {
  for (const user of [F, G, H]) await insertUser(user);
  await seat(WORKSPACE_W_ID, F.id);
  await seat(WORKSPACE_W_ID, G.id);
  await sql`
    update workspace_members set deleted_at = now(), deleted_by = ${A.id}
    where workspace_id = ${WORKSPACE_W_ID} and user_id = ${F.id}`;
  await sql`update users set deleted_at = now(), deleted_by = ${G.id} where id = ${G.id}`;

  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Fixture Lapsed Coven' })), created_by: A.id, updated_by: A.id })}
    returning id`;
  covenY = row.id as string;
  await seat(covenY, A.id);
  await seat(covenY, H.id);
  await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${covenY}`;
});

/** Each user's row as the table holds it, deleted or not: every case's precondition. */
async function rowsOf(...ids: string[]) {
  return sql`
    select id, name, deleted_at from users where id in ${sql(ids)} order by name`;
}

/** The viewer's live seats, by workspace: the scope a name is read under. */
async function liveSeatsOf(userId: string) {
  const rows = await sql`
    select workspace_id from workspace_members where user_id = ${userId} and deleted_at is null`;
  return rows.map((row) => row.workspace_id as string);
}

describe('displayNamesOf', () => {
  it("resolves a co-member's name, the viewer's own included, and the name alone", async () => {
    await expect(liveSeatsOf(B.id)).resolves.toContain(WORKSPACE_W_ID);

    // A string per slot: no email, no row.
    await expect(displayNamesOf(asUser(B), [A.id, C.id, B.id])).resolves.toEqual([
      A.name,
      C.name,
      B.name,
    ]);
  });

  it('resolves a removed member, whose seat is a tombstone', async () => {
    const [seatRow] = await sql`
      select deleted_at from workspace_members
      where workspace_id = ${WORKSPACE_W_ID} and user_id = ${F.id}`;
    expect(seatRow.deleted_at).not.toBeNull();

    await expect(displayNamesOf(asUser(B), [F.id])).resolves.toEqual([F.name]);
  });

  it('resolves a deleted user to the name their row last held', async () => {
    const [row] = await rowsOf(G.id);
    expect(row).toMatchObject({ name: G.name, deleted_at: expect.any(Date) });

    await expect(displayNamesOf(asUser(A), [G.id])).resolves.toEqual([G.name]);
  });

  it('resolves nothing for a user who never shared a coven with the viewer', async () => {
    // D exists and has a name; it sits only in X, where B never has.
    await expect(rowsOf(D.id)).resolves.toEqual([
      expect.objectContaining({ name: D.name, deleted_at: null }),
    ]);
    await expect(liveSeatsOf(D.id)).resolves.toEqual([WORKSPACE_X_ID]);
    await expect(liveSeatsOf(B.id)).resolves.not.toContain(WORKSPACE_X_ID);

    await expect(displayNamesOf(asUser(B), [D.id, A.id])).resolves.toEqual([null, A.name]);
  });

  it('resolves nothing once the viewer has left the coven they shared', async () => {
    // F shared W with A, and A's name is live; F's seat is the tombstone.
    await expect(displayNamesOf(asUser(B), [F.id])).resolves.toEqual([F.name]);
    await expect(liveSeatsOf(F.id)).resolves.toEqual([]);

    await expect(displayNamesOf(asUser({ ...F, role: 'user' }), [A.id])).resolves.toEqual([null]);
  });

  it('resolves nothing through a deleted coven', async () => {
    // A and H both sit in Y, live seats in a deleted coven.
    await expect(liveSeatsOf(H.id)).resolves.toEqual([covenY]);
    await expect(liveSeatsOf(A.id)).resolves.toContain(covenY);

    await expect(displayNamesOf(asUser(A), [H.id])).resolves.toEqual([null]);
  });

  it('gives a site admin no reach past their own covens', async () => {
    await expect(rowsOf(A.id)).resolves.toEqual([
      expect.objectContaining({ name: A.name, deleted_at: null }),
    ]);
    expect(asUser(E).role).toBe('admin');

    await expect(displayNamesOf(asUser(E), [A.id])).resolves.toEqual([null]);
  });

  it('answers an id that names no user, or is no id at all, with null', async () => {
    await expect(
      displayNamesOf(asUser(B), ['00000000-0000-0000-0000-00000000ffff', 'not-an-id', A.id]),
    ).resolves.toEqual([null, null, A.name]);
  });
});
