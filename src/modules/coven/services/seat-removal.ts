import 'server-only';
import { withAudit } from '../../../db/repository';
import type { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { assertNotLastOwner } from './last-owner';
import type { Membership } from './membership';

/**
 * Soft-deletes `userId`'s seat in the writing transaction, under the last-owner guard.
 * @throws {LastOwner} the removal would leave the workspace without a steward.
 * @throws {Forbidden} `missing`, when the seat is already gone.
 */
export async function removeSeat(
  session: Session,
  membership: Membership,
  userId: string,
  missing: Forbidden,
): Promise<void> {
  await withAudit(session, async (write) => {
    await assertNotLastOwner(write, membership, userId, null);
    const [row] = await write.softDeleteMembership(membership, userId);
    if (!row) throw missing;
  });
}
