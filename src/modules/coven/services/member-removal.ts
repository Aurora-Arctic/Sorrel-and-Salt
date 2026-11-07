import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { assertNotLastOwner } from './last-owner';
import { assertMembership, assertSeatToLeave } from './membership';
import { assertNotSystemSeat } from './system-seat';

// A member goes, removed by a steward or leaving. Both soft-delete the row and run the last-owner guard in the writing transaction.
// A removed member invited back is not inserted again: the row still holds the pair, so accepting revives it.

/**
 * Removes `userId` from the workspace (`member: remove`, stewards only); the person must be a live member. A steward may remove
 * themselves here; the guard stops that when they are the last.
 *
 * @throws {Forbidden} not a steward of the workspace, or `userId` is not a live member or is the system user.
 * @throws {LastOwner} the removal would leave the workspace without a steward.
 */
export async function removeMember(
  session: Session,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { member: ['remove'] });
  // An id that cannot name a user is a stranger, as a wrong one is.
  if (!RowId.safeParse(userId).success) throw new Forbidden();
  assertNotSystemSeat(userId);

  await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, userId, null);
    const [row] = await write.softDeleteMembership(membership, userId);
    if (!row) throw new Forbidden('That person is not a member of this coven');
  });
}

/**
 * The caller leaves the workspace. Every role may, so `workspace: read` only proves the caller is a live member; a paused member
 * may leave too (`assertSeatToLeave`). The row left is the session's own, so leaving cannot reach anyone else.
 *
 * @throws {Forbidden} the caller is not a member of the workspace.
 * @throws {LastOwner} the caller is its only owner.
 */
export async function leaveWorkspace(session: Session, workspaceId: string): Promise<void> {
  const membership = await assertSeatToLeave(session, workspaceId);

  await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, session.userId, null);
    const [row] = await write.softDeleteMembership(membership, session.userId);
    // Two tabs leaving at once: the second finds the seat already gone.
    if (!row) throw new Forbidden();
  });
}
