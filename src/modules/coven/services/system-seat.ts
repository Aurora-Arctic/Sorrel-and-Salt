import 'server-only';
import { BOOTSTRAP_USER_ID } from '../../../db/bootstrap';
import { Forbidden } from '../../../lib/errors';

// The system user is never a person, and its owner seat in the demo coven is what keeps the last-owner guard from ever binding an
// admin there, so no removal or role change may reach it.

/** @throws {Forbidden} `userId` is the system user. */
export function assertNotSystemSeat(userId: string): void {
  if (userId === BOOTSTRAP_USER_ID) throw new Forbidden("The system user's seat can't be changed.");
}
