import 'server-only';
import { findOneById, findStandingWorkspaceMemberPause, withAudit } from '../../../db/repository';
import { Forbidden, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { workspaces } from '../schema/workspaces';
import type { MembershipWithWorkspace, WorkspaceRole } from '../types';
import { assertNotLastOwner } from './last-owner';
import { assertMembership } from './membership';
import { assertNotSystemSeat } from './system-seat';

// It changes an existing member's row and nothing else; ownership never comes through an invitation (DESIGN.md §5).

const PAUSED_PROMOTION =
  "This member's access is paused; lift the pause first to make them a steward";

/**
 * Demoting a steward runs the last-owner guard under a lock.
 *
 * @throws {Forbidden} not a steward of the workspace, or `userId` is not a live member or is the system user.
 * @throws {LastOwner} the change would leave the workspace without a steward.
 * @throws {ValidationError} the change makes a steward of a member whose access is paused.
 */
export async function updateMemberRole(
  session: Session,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<MembershipWithWorkspace> {
  const membership = await assertMembership(session, workspaceId, { member: ['update'] });
  if (!RowId.safeParse(userId).success) throw new Forbidden();
  assertNotSystemSeat(userId);
  // A steward's access is never paused, so a paused member is lifted before being made one.
  if (role === 'owner' && (await findStandingWorkspaceMemberPause(membership, userId))) {
    throw new ValidationError([{ path: ['role'], message: PAUSED_PROMOTION }], PAUSED_PROMOTION);
  }

  const updated = await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, userId, role);
    const [row] = await write.updateMembershipRole(membership, userId, role);
    if (!row) throw new Forbidden('That person is not a member of this coven');
    return row;
  });
  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new Forbidden();
  return { ...updated, workspace };
}
