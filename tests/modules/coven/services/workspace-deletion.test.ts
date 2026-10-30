import { describe, expect, it } from 'vitest';
import { findWorkspaceRole } from '@/db/repository';
import { Forbidden } from '@/lib/errors';
import { assertMembership, deleteWorkspace, membershipsOf } from '@/modules/coven';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

useRawClient();

// Deleting a workspace: owners only, a soft delete of the workspace
// row alone. Members lose access because the lookups that admit them stop
// finding a deleted workspace; their rows are left as they were.

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

describe('deleteWorkspace', () => {
  it('soft-deletes the workspace row, stamped from the session, and nothing else', async () => {
    const covenId = await insertCoven('Fixture Deletion Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    await deleteWorkspace(asUser(A), covenId);

    const [row] = await sql`select deleted_at, deleted_by from workspaces where id = ${covenId}`;
    expect(row?.deleted_at).toBeInstanceOf(Date);
    expect(row?.deleted_by).toBe(A.id);
    const members = await sql`
      select user_id, deleted_at from workspace_members where workspace_id = ${covenId}`;
    expect(members).toHaveLength(2);
    expect(members.every((member) => member.deleted_at === null)).toBe(true);
  });

  it('refuses a member or a viewer, who do belong to the coven', async () => {
    const covenId = await insertCoven('Fixture Deletion Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    // Why the refusal is the permission's: each caller holds a live membership.
    await expect(findWorkspaceRole(B.id, covenId)).resolves.toBe('member');
    await expect(findWorkspaceRole(C.id, covenId)).resolves.toBe('viewer');

    await expect(deleteWorkspace(asUser(B), covenId)).rejects.toThrow(Forbidden);
    await expect(deleteWorkspace(asUser(C), covenId)).rejects.toThrow(Forbidden);

    const [row] = await sql`select deleted_at from workspaces where id = ${covenId}`;
    expect(row?.deleted_at).toBeNull();
  });

  it('refuses a stranger and an id that names no workspace, by direct id', async () => {
    const covenId = await insertCoven('Fixture Deletion Stranger Coven', [[A.id, 'owner']]);

    await expect(deleteWorkspace(asUser(D), covenId)).rejects.toThrow(Forbidden);
    await expect(deleteWorkspace(asUser(A), 'not-an-id')).rejects.toThrow(Forbidden);

    const [row] = await sql`select deleted_at from workspaces where id = ${covenId}`;
    expect(row?.deleted_at).toBeNull();
  });

  it('takes every member out at once, other owners included, leaving their rows live', async () => {
    const covenId = await insertCoven('Fixture Deletion Access Coven', [
      [A.id, 'owner'],
      [D.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    for (const user of [A, D, B, C]) {
      // Why the loss below is the deletion's: each holds a proof beforehand.
      await expect(
        assertMembership(asUser(user), covenId, { workspace: ['read'] }),
      ).resolves.toBeTruthy();
    }

    await deleteWorkspace(asUser(A), covenId);

    for (const user of [A, D, B, C]) {
      await expect(
        assertMembership(asUser(user), covenId, { workspace: ['read'] }),
      ).rejects.toThrow(Forbidden);
      const [held] = await membershipsOf(asUser(user), [user.id]);
      expect(held).not.toBeInstanceOf(Forbidden);
      expect((held as { workspaceId: string }[]).map((m) => m.workspaceId)).not.toContain(covenId);
    }
  });

  it('refuses a second delete of the same workspace', async () => {
    const covenId = await insertCoven('Fixture Deletion Twice Coven', [[A.id, 'owner']]);
    await deleteWorkspace(asUser(A), covenId);

    await expect(deleteWorkspace(asUser(A), covenId)).rejects.toThrow(Forbidden);
  });
});
