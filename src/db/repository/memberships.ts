import { and, eq, inArray } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
// Type-only, so it is erased and no runtime cycle forms with the service that
// imports `findWorkspaceRole` below. The brand has to live beside the check
// that mints it (CLAUDE.md rule 1), which is why the direction is this way up.
import type { WorkspaceRole } from '@/modules/coven';
import { existsIn, selectFrom } from './select';
import { notSoftDeleted } from './shapes';

/**
 * The one workspace-scoped read that takes no proof, because it is what mints
 * one: `assertMembership` has nothing to pass until this has answered. It is
 * narrow on purpose — a role, not rows — so it cannot stand in for a finder,
 * and the index's export list is pinned, so a second exception is a decision
 * rather than an addition.
 */
export async function findWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | undefined> {
  const [row] = await selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
    ),
  );
  return row?.role;
}

/**
 * Every live membership each of these users holds, in a workspace that is
 * itself live. The second read that takes no proof, and for the reason the
 * first does: a user's own memberships span workspaces, so there is no one
 * workspace to hold a proof for. The service calling it decides whose ids may
 * be asked about; the index's export list is pinned, so a third is a
 * decision.
 *
 * The workspace's own `deleted_at` is `existsIn`'s to check: a correlated
 * `EXISTS` rather than a join, so the rows come back in the membership's own
 * shape.
 */
export async function findMembershipsOfUsers(
  userIds: readonly string[],
): Promise<(typeof workspaceMembers.$inferSelect)[]> {
  if (userIds.length === 0) return [];
  return selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      inArray(workspaceMembers.userId, [...userIds]),
      existsIn(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)),
    ),
  );
}
