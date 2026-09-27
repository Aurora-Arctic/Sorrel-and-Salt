import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { findMembershipsOfUsers, findWorkspaceRole, withAudit } from '@/db/repository';
import { workspaces } from '@/modules/coven/schema/workspaces';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { A, B, C, D, E, asUser } from '../../support/as-user';
import { makeWorkspace } from '../../support/fixtures';
import { sql, useRawClient } from '../../support/db/probe-tables';

useRawClient();

describe('the Membership proof (M6.3)', () => {
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
