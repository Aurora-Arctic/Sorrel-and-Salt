import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { assertNotLastOwner } from './last-owner';
import { assertMembership } from './membership';

// A member goes, removed by an owner or leaving. Both soft-delete the row and run the last-owner guard in the writing transaction.
// A removed member invited back is not inserted again: the row still holds the pair, so accepting revives it.

/**
 * Removes `userId` from the workspace. The caller needs `member: remove`,
 * which only owners hold, and the person must be a live member already. An
 * owner may remove themselves here as well; the guard stops that when they
 * are the last.
 *
 * @throws {Forbidden} the caller is not an owner of the workspace, or `userId`
 * is not a live member of it.
 * @throws {LastOwner} the removal would leave the workspace without an owner.
 */
export async function removeMember(
  session: Session,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { member: ['remove'] });
  // An id that cannot name a user is a stranger, as a wrong one is.
  if (!RowId.safeParse(userId).success) throw new Forbidden();

  await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, userId, null);
    const [row] = await write.softDeleteMembership(membership, userId);
    if (!row) throw new Forbidden('That person is not a member of this coven');
  });
}

/**
 * The caller leaves the workspace. Every role may, a viewer included, so no
 * `member` statement is asked for: `workspace: read`, which every role holds,
 * only proves the caller is a live member. The row left is the session's own
 * and there is no argument to name another's, so leaving cannot reach anyone
 * else.
 *
 * @throws {Forbidden} the caller is not a member of the workspace.
 * @throws {LastOwner} the caller is its only owner.
 */
export async function leaveWorkspace(session: Session, workspaceId: string): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { workspace: ['read'] });

  await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, session.userId, null);
    const [row] = await write.softDeleteMembership(membership, session.userId);
    // Two tabs leaving at once: the second finds the seat already gone.
    if (!row) throw new Forbidden();
  });
}
