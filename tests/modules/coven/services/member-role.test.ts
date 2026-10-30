import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { findWorkspaceRole } from '@/db/repository';
import { Forbidden } from '@/lib/errors';
import { LastOwner, updateMemberRole } from '@/modules/coven';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

useRawClient();

// Changing a member's role: owners only, any move between the three
// roles, an existing member's row and nothing else.

type Role = 'owner' | 'member' | 'viewer';

async function insertCoven(name: string, members: [string, Role][]): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

const roleOf = async (workspaceId: string, userId: string) => {
  const [row] = await sql`
    select role from workspace_members
    where workspace_id = ${workspaceId} and user_id = ${userId} and deleted_at is null`;
  return row?.role as Role | undefined;
};

describe('updateMemberRole', () => {
  it('moves a member between any two roles, in either direction', async () => {
    const covenId = await insertCoven('Fixture Role Change Coven', [
      [A.id, 'owner'],
      [D.id, 'owner'],
      [B.id, 'viewer'],
    ]);

    const moves: Role[] = ['member', 'owner', 'viewer', 'owner', 'member', 'viewer'];
    for (const role of moves) {
      const row = await updateMemberRole(asUser(A), covenId, B.id, role);
      expect(row).toMatchObject({ userId: B.id, role });
      expect(await roleOf(covenId, B.id)).toBe(role);
    }
  });

  it('refuses a member or a viewer, who do belong to the coven', async () => {
    const covenId = await insertCoven('Fixture Role Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    // Why the refusal is the permission's: each caller holds a live membership.
    expect(await roleOf(covenId, B.id)).toBe('member');
    expect(await roleOf(covenId, C.id)).toBe('viewer');

    await expect(updateMemberRole(asUser(B), covenId, C.id, 'owner')).rejects.toThrow(Forbidden);
    await expect(updateMemberRole(asUser(C), covenId, B.id, 'viewer')).rejects.toThrow(Forbidden);
    await expect(updateMemberRole(asUser(B), covenId, B.id, 'owner')).rejects.toThrow(Forbidden);
    expect(await roleOf(covenId, B.id)).toBe('member');
    expect(await roleOf(covenId, C.id)).toBe('viewer');
  });

  it("refuses an owner of another coven, by this coven's id", async () => {
    const covenId = await insertCoven('Fixture Home Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await insertCoven('Fixture Other Coven', [[D.id, 'owner']]);

    await expect(updateMemberRole(asUser(D), covenId, B.id, 'owner')).rejects.toThrow(Forbidden);
    expect(await roleOf(covenId, B.id)).toBe('member');
  });

  it('refuses to demote the only owner, with the way out the guard carries', async () => {
    const covenId = await insertCoven('Fixture Sole Owner Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    const error = await updateMemberRole(asUser(A), covenId, A.id, 'member').catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(LastOwner);
    expect(error).toMatchObject({ remedy: 'promote', promotable: [B.id] });
    expect(await roleOf(covenId, A.id)).toBe('owner');
  });

  it('lets an owner step down while another owner remains', async () => {
    const covenId = await insertCoven('Fixture Two Owners Coven', [
      [A.id, 'owner'],
      [B.id, 'owner'],
    ]);

    await updateMemberRole(asUser(A), covenId, A.id, 'viewer');
    expect(await roleOf(covenId, A.id)).toBe('viewer');
  });

  it('refuses anyone who is not a live member of the coven, and inserts no row', async () => {
    const covenId = await insertCoven('Fixture Non Member Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    await sql`
      insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by, expires_at)
      values ('fixture-invitee@example.test', 'fixture-hash', ${covenId}, 'member', ${A.id}, ${A.id},
        now() + interval '7 days')`;
    await sql`update workspace_members set deleted_at = now(), deleted_by = ${A.id}
      where workspace_id = ${covenId} and user_id = ${C.id}`;

    // D belongs to no coven here; C was removed; the invitee has no account row at all.
    for (const target of [D.id, C.id, '00000000-0000-4000-8000-000000000000']) {
      await expect(updateMemberRole(asUser(A), covenId, target, 'owner')).rejects.toThrow(
        Forbidden,
      );
    }
    const rows = await sql`select user_id from workspace_members where workspace_id = ${covenId}`;
    expect(rows.map((row) => row.user_id).sort()).toEqual([A.id, B.id, C.id].sort());
    expect(await roleOf(covenId, C.id)).toBeUndefined();
  });

  it('leaves joinedAt alone, and stamps the change on updated_by', async () => {
    const covenId = await insertCoven('Fixture Joined Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await sql`update workspace_members set joined_at = '2020-01-01T00:00:00Z'
      where workspace_id = ${covenId} and user_id = ${B.id}`;

    await updateMemberRole(asUser(A), covenId, B.id, 'owner');

    const [row] = await sql`
      select joined_at, updated_by from workspace_members
      where workspace_id = ${covenId} and user_id = ${B.id}`;
    expect((row.joined_at as Date).toISOString()).toBe('2020-01-01T00:00:00.000Z');
    expect(row.updated_by).toBe(A.id);
  });
  it('refuses to re-role the system user, though another owner exists', async () => {
    const covenId = await insertCoven('Fixture System Seat Coven', [
      [A.id, 'owner'],
      [BOOTSTRAP_USER_ID, 'owner'],
    ]);
    // Why the refusal is the system-seat rule's: A also owns the coven, so the last-owner guard alone would let this through.
    await expect(findWorkspaceRole(A.id, covenId)).resolves.toBe('owner');
    await expect(findWorkspaceRole(BOOTSTRAP_USER_ID, covenId)).resolves.toBe('owner');

    await expect(updateMemberRole(asUser(A), covenId, BOOTSTRAP_USER_ID, 'viewer')).rejects.toThrow(
      "The system user's seat can't be changed.",
    );

    expect(await roleOf(covenId, BOOTSTRAP_USER_ID)).toBe('owner');
  });
});
