import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { isRowId } from '../../../lib/validation';
import { assertMembership, assertSeatToLeave } from './membership';
import { notAMember } from './not-a-member';
import { removeSeat } from './seat-removal';
import { assertNotSystemSeat } from './system-seat';

// Both soft-delete the row and run the last-owner guard in the writing transaction.
// A removed member invited back is not inserted again: the row still holds the pair, so accepting revives it.

/**
 * @throws {Forbidden} not a steward of the workspace, or `userId` is not a live member or is the system user.
 * @throws {LastOwner} the removal would leave the workspace without a steward.
 */
export async function removeMember(
  session: Session,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { member: ['remove'] });
  if (!isRowId(userId)) throw new Forbidden();
  assertNotSystemSeat(userId);

  await removeSeat(session, membership, userId, notAMember());
}

/**
 * Every role may leave, so `workspace: read` only proves the caller is a live member; a paused member may leave too (`assertSeatToLeave`).
 *
 * @throws {Forbidden} the caller is not a member of the workspace.
 * @throws {LastOwner} the caller is its only owner.
 */
export async function leaveWorkspace(session: Session, workspaceId: string): Promise<void> {
  const membership = await assertSeatToLeave(session, workspaceId);

  // Two tabs leaving at once: the second finds the seat already gone.
  await removeSeat(session, membership, session.userId, new Forbidden());
}
