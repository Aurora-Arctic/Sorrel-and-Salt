import { describe, expect, it } from 'vitest';
import { findWorkspaceRole, withAudit } from '@/db/repository';
import { Forbidden } from '@/lib/errors';
import { LastOwner, leaveWorkspace, removeMember, updateMemberRole } from '@/modules/coven';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

useRawClient();

// Removing a member and leaving: both soft-delete the membership row,
// stamped from the session, and both run the last-owner guard. The revive
// write is the way back for a person invited again.

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

async function seat(covenId: string, userId: string) {
  const [row] = await sql`
    select role, joined_at, deleted_at, deleted_by, updated_by from workspace_members
    where workspace_id = ${covenId} and user_id = ${userId}`;
  return row;
}

describe('removeMember', () => {
  it('soft-deletes the member’s row, stamped from the session, and no one else’s', async () => {
    const covenId = await insertCoven('Fixture Removal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    // Why the removal is the writer's: B holds a live seat beforehand.
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBe('member');

    await removeMember(asUser(A), covenId, B.id);

    const removed = await seat(covenId, B.id);
    expect(removed.deleted_at).toBeInstanceOf(Date);
    expect(removed.deleted_by).toBe(A.id);
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBeUndefined();
    expect((await seat(covenId, A.id)).deleted_at).toBeNull();
    expect((await seat(covenId, C.id)).deleted_at).toBeNull();
  });

  it('refuses a member or a viewer, who do belong to the coven, by direct id', async () => {
    const covenId = await insertCoven('Fixture Removal Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBe('member');
    await expect(findWorkspaceRole(C.id, covenId)).resolves.toBe('viewer');

    await expect(removeMember(asUser(B), covenId, C.id)).rejects.toThrow(Forbidden);
    await expect(removeMember(asUser(C), covenId, B.id)).rejects.toThrow(Forbidden);

    expect((await seat(covenId, B.id)).deleted_at).toBeNull();
    expect((await seat(covenId, C.id)).deleted_at).toBeNull();
  });

  it('refuses a stranger, an id naming no user, and a person who is not a member', async () => {
    const covenId = await insertCoven('Fixture Removal Stranger Coven', [[A.id, 'owner']]);
    await expect(findWorkspaceRole(D.id, covenId)).resolves.toBeUndefined();

    await expect(removeMember(asUser(D), covenId, A.id)).rejects.toThrow(Forbidden);
    await expect(removeMember(asUser(A), covenId, 'not-an-id')).rejects.toThrow(Forbidden);
    await expect(removeMember(asUser(A), covenId, D.id)).rejects.toThrow(Forbidden);

    expect((await seat(covenId, A.id)).deleted_at).toBeNull();
  });

  it('refuses removing the last owner, with the remedy, and removes one of two', async () => {
    const covenId = await insertCoven('Fixture Removal Owners Coven', [
      [A.id, 'owner'],
      [B.id, 'owner'],
    ]);

    await removeMember(asUser(A), covenId, B.id);
    // Why the next refusal is the guard's: A holds `member: remove` and is the one owner left.
    await expect(findWorkspaceRole(A.id, covenId)).resolves.toBe('owner');
    const refusal = await removeMember(asUser(A), covenId, A.id).catch((error) => error);

    expect(refusal).toBeInstanceOf(LastOwner);
    expect((await seat(covenId, A.id)).deleted_at).toBeNull();
  });

  it('never overwrites who made an earlier removal', async () => {
    const covenId = await insertCoven('Fixture Removal Twice Coven', [
      [A.id, 'owner'],
      [D.id, 'owner'],
      [B.id, 'member'],
    ]);
    await removeMember(asUser(A), covenId, B.id);

    await expect(removeMember(asUser(D), covenId, B.id)).rejects.toThrow(Forbidden);

    expect((await seat(covenId, B.id)).deleted_by).toBe(A.id);
  });
});

describe('leaveWorkspace', () => {
  it.each<Role>(['viewer', 'member'])(
    'lets a %s leave, soft-deleting only their own row',
    async (role) => {
      const covenId = await insertCoven(`Fixture Leave ${role} Coven`, [
        [A.id, 'owner'],
        [C.id, role],
        [B.id, 'member'],
      ]);
      await expect(findWorkspaceRole(C.id, covenId)).resolves.toBe(role);

      await leaveWorkspace(asUser(C), covenId);

      const left = await seat(covenId, C.id);
      expect(left.deleted_at).toBeInstanceOf(Date);
      expect(left.deleted_by).toBe(C.id);
      await expect(findWorkspaceRole(C.id, covenId)).resolves.toBeUndefined();
      expect((await seat(covenId, A.id)).deleted_at).toBeNull();
      expect((await seat(covenId, B.id)).deleted_at).toBeNull();
    },
  );

  it('refuses a stranger and an id naming no workspace', async () => {
    const covenId = await insertCoven('Fixture Leave Stranger Coven', [[A.id, 'owner']]);
    await expect(findWorkspaceRole(D.id, covenId)).resolves.toBeUndefined();

    await expect(leaveWorkspace(asUser(D), covenId)).rejects.toThrow(Forbidden);
    await expect(leaveWorkspace(asUser(A), 'not-an-id')).rejects.toThrow(Forbidden);

    expect((await seat(covenId, A.id)).deleted_at).toBeNull();
  });

  it('refuses the only owner leaving, offering promotion or deletion, and lets one of two go', async () => {
    const covenId = await insertCoven('Fixture Leave Owners Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    const refusal = await leaveWorkspace(asUser(A), covenId).catch((error) => error);
    expect(refusal).toBeInstanceOf(LastOwner);
    expect(refusal.remedy).toBe('promote');
    expect((await seat(covenId, A.id)).deleted_at).toBeNull();

    const alone = await insertCoven('Fixture Leave Alone Coven', [[A.id, 'owner']]);
    const aloneRefusal = await leaveWorkspace(asUser(A), alone).catch((error) => error);
    expect(aloneRefusal).toBeInstanceOf(LastOwner);
    expect(aloneRefusal.remedy).toBe('delete');

    await sql`update workspace_members set role = 'owner' where workspace_id = ${covenId} and user_id = ${B.id}`;
    await leaveWorkspace(asUser(A), covenId);
    expect((await seat(covenId, A.id)).deleted_at).toBeInstanceOf(Date);
  });

  it('refuses a second leave from the same seat', async () => {
    const covenId = await insertCoven('Fixture Leave Twice Coven', [
      [A.id, 'owner'],
      [C.id, 'viewer'],
    ]);
    await leaveWorkspace(asUser(C), covenId);

    await expect(leaveWorkspace(asUser(C), covenId)).rejects.toThrow(Forbidden);
  });
});

describe('reviveMembership', () => {
  it('restores a removed member at the given role, deletion cleared and joinedAt restarted', async () => {
    const covenId = await insertCoven('Fixture Revive Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    const joined = (await seat(covenId, B.id)).joined_at as Date;
    await removeMember(asUser(A), covenId, B.id);
    expect((await seat(covenId, B.id)).deleted_at).not.toBeNull();

    const rows = await withAudit(asUser(A), (write) =>
      write.reviveMembership(covenId, B.id, 'viewer', null),
    );

    expect(rows).toHaveLength(1);
    const revived = await seat(covenId, B.id);
    expect(revived.role).toBe('viewer');
    expect(revived.deleted_at).toBeNull();
    expect(revived.deleted_by).toBeNull();
    expect(revived.updated_by).toBe(A.id);
    expect((revived.joined_at as Date).getTime()).toBeGreaterThan(joined.getTime());
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBe('viewer');
  });

  it('touches no live row, and no other workspace’s removed row', async () => {
    const covenId = await insertCoven('Fixture Revive Live Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    const other = await insertCoven('Fixture Revive Other Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await removeMember(asUser(A), other, B.id);
    const before = await seat(covenId, B.id);
    expect(before.deleted_at).toBeNull();

    const rows = await withAudit(asUser(A), (write) =>
      write.reviveMembership(covenId, B.id, 'owner', null),
    );

    expect(rows).toHaveLength(0);
    expect(await seat(covenId, B.id)).toEqual(before);
    expect((await seat(other, B.id)).deleted_at).not.toBeNull();
  });
});

describe('handing a coven over, then leaving', () => {
  it('promotes first, so the leave that follows finds a second owner and the coven keeps one', async () => {
    const covenId = await insertCoven('Fixture Handover Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    // Why the leave is the guard's to refuse: A is the only owner.
    await expect(leaveWorkspace(asUser(A), covenId)).rejects.toThrow(LastOwner);

    await updateMemberRole(asUser(A), covenId, B.id, 'owner');
    await leaveWorkspace(asUser(A), covenId);

    await expect(findWorkspaceRole(A.id, covenId)).resolves.toBeUndefined();
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBe('owner');
  });

  it('keeps both owners when the leave does not happen after the promotion', async () => {
    const covenId = await insertCoven('Fixture Handover Halfway Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    await updateMemberRole(asUser(A), covenId, B.id, 'owner');

    await expect(findWorkspaceRole(A.id, covenId)).resolves.toBe('owner');
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBe('owner');
  });
});
