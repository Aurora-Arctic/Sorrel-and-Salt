import 'server-only';
import { findOneById, findStandingUserAccessPause, withAudit } from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import type { UserAccessPauseRow } from '../types';
import { assertChangesOpen } from './admin-role-pause';
import { isPrimaryAdmin } from './primary-admin';
import { assertSiteAdmin } from './site-admin';

// The site access pause: an admin stops a user signing in, until a time or with no end, and may lift it early. Setting one ends
// every session the user holds; the sign-in refusal is Better Auth's session hook in src/lib/auth.ts, which reads
// `standingAccessPause` (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access").

const REFUSAL = 'Only a site admin may pause or lift a user’s access';
const PRIMARY_REFUSAL = 'The primary admin’s access cannot be paused';
const SELF_REFUSAL = 'You cannot pause your own access';
const NOTE_MAX_LENGTH = 500;

/**
 * Pauses a user's access until `until`, or with no end when `until` is `null`, and ends every session they hold. Pausing
 * another admin waits on admin changes being open, as revoking one does.
 *
 * @throws {Forbidden} the session is not an admin; the user is the primary admin or the caller; or admin changes are paused
 * and the user is an admin.
 * @throws {NotFound} no live user has this id.
 * @throws {ValidationError} `until` is not in the future, the note is over 500 characters, or a pause already stands.
 */
export async function pauseUserAccess(
  session: Session,
  userId: string,
  until: Date | null | undefined,
  note: string | null | undefined,
): Promise<UserAccessPauseRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  const trimmed = note?.trim() || null;
  if (
    until != null &&
    (!(until instanceof Date) || Number.isNaN(until.getTime()) || until.getTime() <= Date.now())
  ) {
    throw new ValidationError([{ path: ['until'], message: 'Choose a time in the future' }]);
  }
  if (trimmed && trimmed.length > NOTE_MAX_LENGTH) {
    throw new ValidationError([
      { path: ['note'], message: `Keep the note to ${NOTE_MAX_LENGTH} characters` },
    ]);
  }
  const user = await findOneById(users, id);
  if (!user) throw new NotFound('No such user');
  if (isPrimaryAdmin(user)) throw new Forbidden(PRIMARY_REFUSAL);
  if (user.id === session.userId) throw new Forbidden(SELF_REFUSAL);
  if (user.role === 'admin') await assertChangesOpen(session, admin);
  if (await findStandingUserAccessPause(user.id)) {
    throw new ValidationError([
      { path: ['userId'], message: 'This user is already paused; lift the pause first' },
    ]);
  }
  return withAudit(session, async (write) => {
    const [row] = await write.setUserAccessPause(admin, user.id, {
      until: until ?? null,
      note: trimmed,
    });
    // An empty answer is a pause another admin set in the same moment, which took the one live slot.
    if (!row) {
      throw new ValidationError([
        { path: ['userId'], message: 'This user is already paused; lift the pause first' },
      ]);
    }
    return row;
  });
}

/**
 * Lifts the pause standing on a user's access now, and answers it.
 *
 * @throws {Forbidden} the session is not an admin.
 * @throws {NotFound} no live user has this id, or no pause stands on them: lifted already, or run out.
 */
export async function liftUserAccessPause(
  session: Session,
  userId: string,
): Promise<UserAccessPauseRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  if (!(await findOneById(users, id))) throw new NotFound('No such user');
  const [row] = await withAudit(session, (write) => write.liftUserAccessPause(admin, id));
  if (!row) throw new NotFound('No pause stands on this user');
  return row;
}

/**
 * The pause standing on a user's access, or `undefined`: what sign-in reads before it makes a session. Takes no session, as
 * there is none yet; it answers only for the account whose credential was just proved.
 */
export function standingAccessPause(userId: string): Promise<UserAccessPauseRow | undefined> {
  return findStandingUserAccessPause(userId);
}
