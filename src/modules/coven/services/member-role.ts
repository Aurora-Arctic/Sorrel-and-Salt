import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { workspaces } from '../schema/workspaces';
import type { MembershipWithWorkspace, WorkspaceRole } from '../types';
import { assertNotLastOwner } from './last-owner';
import { assertMembership } from './membership';

// An owner moves a member between viewer, member and owner, either way.
// It changes an existing member's row and nothing else — a pending invitation
// is not a member, and ownership never comes through one (DESIGN.md §5).

/**
 * Sets `userId`'s role in the workspace. The caller needs `member: update`,
 * which only owners hold, and the person must be a live member already.
 * Demoting an owner runs the last-owner guard, under a lock, in the
 * transaction that writes. `joinedAt` is untouched: the person joined when
 * they joined.
 *
 * @throws {Forbidden} the caller is not an owner of the workspace, or `userId`
 * is not a live member of it.
 * @throws {LastOwner} the change would leave the workspace without an owner.
 */
export async function updateMemberRole(
  session: Session,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<MembershipWithWorkspace> {
  const membership = await assertMembership(session, workspaceId, { member: ['update'] });
  // An id that cannot name a user is a stranger, as a wrong one is.
  if (!RowId.safeParse(userId).success) throw new Forbidden();

  const updated = await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, userId, role);
    const [row] = await write.updateMembershipRole(membership, userId, role);
    if (!row) throw new Forbidden('That person is not a member of this coven');
    return row;
  });
  // The proof was minted from a live membership of it, so the workspace is there.
  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new Forbidden();
  return { ...updated, workspace };
}
