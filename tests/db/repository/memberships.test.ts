import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  findMemberEmails,
  findMemberPage,
  findMembershipsOfUsers,
  findWorkspaceRole,
  withAudit,
} from '@/db/repository';
import type { Cursor } from '@/lib/types';
import { assertMembership } from '@/modules/coven';
import { workspaces } from '@/modules/coven/schema/workspaces';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { A, B, C, D, E, asUser } from '../../support/as-user';
import { makeWorkspace } from '../../support/fixtures';
import { sql, useRawClient } from '../../support/db/probe-tables';

useRawClient();

describe('the Membership proof', () => {
  describe('findWorkspaceRole, the read that mints a proof', () => {
    it('answers with the role the seeded membership names', async () => {
      await expect(findWorkspaceRole(A.id, WORKSPACE_W_ID)).resolves.toBe('owner');
      await expect(findWorkspaceRole(B.id, WORKSPACE_W_ID)).resolves.toBe('member');
      await expect(findWorkspaceRole(C.id, WORKSPACE_W_ID)).resolves.toBe('viewer');
    });

    it('answers undefined across workspaces, so there is nothing to mint a proof from', async () => {
      // Why this could have answered a role: A holds one, in the workspace
      // above, so the finder is reached and the table is not empty.
      await expect(findWorkspaceRole(A.id, WORKSPACE_X_ID)).resolves.toBeUndefined();
    });

    it('answers undefined for a live membership of a soft-deleted workspace', async () => {
      const { slug } = makeWorkspace({ name: 'Fixture Coven Role Razed' });
      const [workspace] = await withAudit(asUser(A), (write) =>
        write.insert(workspaces, { name: 'Fixture Coven Role Razed', slug }),
      );
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${A.id}, 'owner', ${A.id}, ${A.id})
      `;
      // Why the answer below is the workspace check's: before the delete the
      // role is found, and after it the membership row is still live.
      await expect(findWorkspaceRole(A.id, workspace.id)).resolves.toBe('owner');

      await withAudit(asUser(A), (write) =>
        write.softDelete(workspaces, eq(workspaces.id, workspace.id)),
      );

      const [member] = await sql`
        select deleted_at from workspace_members
        where workspace_id = ${workspace.id} and user_id = ${A.id}
      `;
      expect(member?.deleted_at).toBeNull();
      await expect(findWorkspaceRole(A.id, workspace.id)).resolves.toBeUndefined();
    });
  });

  describe('findMembershipsOfUsers, the second read that takes no proof', () => {
    const summary = (rows: { userId: string; workspaceId: string; role: string }[]) =>
      rows.map(({ userId, workspaceId, role }) => ({ userId, workspaceId, role }));

    /** A fresh coven with A as its owner, written as the seed would: no proof exists yet. */
    async function covenOwnedByA(name: string) {
      const { slug } = makeWorkspace({ name });
      const [workspace] = await withAudit(asUser(A), (write) =>
        write.insert(workspaces, { name, slug }),
      );
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${A.id}, 'owner', ${A.id}, ${A.id})
      `;
      return workspace;
    }

    it('answers every live membership of each user named, across workspaces', async () => {
      const rows = await findMembershipsOfUsers([A.id, D.id]);

      expect(summary(rows)).toEqual(
        expect.arrayContaining([
          { userId: A.id, workspaceId: WORKSPACE_W_ID, role: 'owner' },
          { userId: D.id, workspaceId: WORKSPACE_X_ID, role: 'member' },
        ]),
      );
      expect(rows).toHaveLength(2);
    });

    it('answers nothing for a user in no workspace, and no query for no users', async () => {
      // E is the site admin and a member of nothing (the fixture cast).
      await expect(findMembershipsOfUsers([E.id])).resolves.toEqual([]);
      await expect(findMembershipsOfUsers([])).resolves.toEqual([]);
    });

    it('leaves out a soft-deleted membership', async () => {
      const workspace = await covenOwnedByA('Fixture Coven Lapsed');
      // Why its absence below means the filter: before the delete it is found.
      expect(summary(await findMembershipsOfUsers([A.id]))).toContainEqual({
        userId: A.id,
        workspaceId: workspace.id,
        role: 'owner',
      });

      await sql`
        update workspace_members set deleted_at = now(), deleted_by = ${A.id}
        where workspace_id = ${workspace.id}
      `;

      const ids = (await findMembershipsOfUsers([A.id])).map((row) => row.workspaceId);
      expect(ids).toEqual([WORKSPACE_W_ID]);
    });

    it('leaves out a live membership of a soft-deleted workspace', async () => {
      const workspace = await covenOwnedByA('Fixture Coven Razed');
      expect((await findMembershipsOfUsers([A.id])).map((row) => row.workspaceId)).toContain(
        workspace.id,
      );

      await withAudit(asUser(A), (write) =>
        write.softDelete(workspaces, eq(workspaces.id, workspace.id)),
      );

      const ids = (await findMembershipsOfUsers([A.id])).map((row) => row.workspaceId);
      expect(ids).toEqual([WORKSPACE_W_ID]);
    });
  });
});

describe('findMemberPage, a coven roll keyed on the pair', () => {
  /** A coven owned by A whose seats all joined at one instant, so only the tiebreak orders them. */
  async function covenJoinedAtOnce(name: string, others: string[]) {
    const { slug } = makeWorkspace({ name });
    const [workspace] = await withAudit(asUser(A), (write) =>
      write.insert(workspaces, { name, slug }),
    );
    for (const [userId, role] of [[A.id, 'owner'], ...others.map((id) => [id, 'member'])]) {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, joined_at, created_by, updated_by)
        values (${workspace.id}, ${userId}, ${role}, '2026-01-01T00:00:00Z', ${A.id}, ${A.id})
      `;
    }
    return workspace;
  }

  it("pages the proof's coven alone, the user id breaking a tie in the joining date", async () => {
    const workspace = await covenJoinedAtOnce('Fixture Coven Simultaneous', [B.id, D.id]);
    const membership = await assertMembership(asUser(A), workspace.id, { member: ['read'] });

    // A page of one at a time: a tiebreak that skipped or replayed a row on
    // an equal date would lose or repeat a member across the walk.
    const walked: string[] = [];
    let after: Cursor | undefined;
    for (;;) {
      const [entry] = await findMemberPage(membership, { after, limit: 1, inverted: false });
      if (!entry) break;
      expect(entry.node.workspaceId).toBe(workspace.id);
      walked.push(entry.node.userId);
      after = entry.cursor;
    }

    expect(walked).toEqual([A.id, B.id, D.id].sort());
  });
});

describe("findMemberEmails, the roll's addresses under the proof", () => {
  it("answers the proof's coven's live members alone, whichever ids are asked about", async () => {
    // Why D could have been answered: D holds a live seat, in X, and a user row.
    await expect(findWorkspaceRole(D.id, WORKSPACE_X_ID)).resolves.toBe('member');
    const membership = await assertMembership(asUser(A), WORKSPACE_W_ID, { member: ['read'] });

    const rows = await findMemberEmails(membership, [A.id, B.id, D.id, E.id]);

    expect(rows.map(({ id }) => id).sort()).toEqual([A.id, B.id].sort());
    expect(rows.find(({ id }) => id === B.id)).toEqual({
      id: B.id,
      email: B.email,
    });
  });
});
