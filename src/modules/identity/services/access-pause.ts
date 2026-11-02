import 'server-only';
import {
  findOneById,
  findStandingUserAccessPause,
  findStandingUserAccessPausesFor,
  findUserAccessPausePage,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError, fieldRefusal } from '../../../lib/errors';
import { isStandInAccount } from '../../../lib/system-actor';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import type { UserAccessPauseRow } from '../types';
import { assertChangesOpen } from './admin-role-pause';
import { isPrimaryAdmin } from './primary-admin';
import { assertSiteAdmin } from './site-admin';

// The site access pause: an admin closes the site but support to a user, until a time or with no end, and may lift it early.
// Setting one ends every session the user holds; every signed-in request reads `standingAccessPause` through
// src/lib/request-session.ts (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access").

const REFUSAL = 'Only a site admin may pause or lift a user’s access';
const PRIMARY_REFUSAL = 'The primary admin’s access cannot be paused';
const SELF_REFUSAL = 'You cannot pause your own access';
const STAND_IN_REFUSAL = 'This account is not a person, so its access cannot be paused';
const NOTE_MAX_LENGTH = 500;
const PAST_END = 'Choose a time in the future';
const LONG_NOTE = `Keep the note to ${NOTE_MAX_LENGTH} characters`;
const NO_NOTE = 'Write a note saying why';
const ALREADY_PAUSED = 'This user is already paused; lift the pause first';

/**
 * Pauses a user's access until `until`, or with no end when `until` is `null`, and ends every session they hold. Pausing
 * another admin waits on admin changes being open, as revoking one does.
 *
 * @throws {Forbidden} the session is not an admin; the user is the primary admin, the caller, the System account or the signed-out
 * sender account; or admin changes are paused
 * and the user is an admin.
 * @throws {NotFound} no live user has this id.
 * @throws {ValidationError} `until` is not in the future, the note is missing, blank or over 500 characters, or a pause
 * already stands.
 */
export async function pauseUserAccess(
  session: Session,
  userId: string,
  until: Date | null | undefined,
  note: string | null | undefined,
): Promise<UserAccessPauseRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  const trimmed = note?.trim() ?? '';
  if (
    until != null &&
    (!(until instanceof Date) || Number.isNaN(until.getTime()) || until.getTime() <= Date.now())
  ) {
    throw fieldRefusal('until', PAST_END);
  }
  if (!trimmed) throw fieldRefusal('note', NO_NOTE);
  if (trimmed.length > NOTE_MAX_LENGTH) {
    throw fieldRefusal('note', LONG_NOTE);
  }
  const user = await findOneById(users, id);
  if (!user) throw new NotFound('No such user');
  if (isPrimaryAdmin(user)) throw new Forbidden(PRIMARY_REFUSAL);
  if (user.id === session.userId) throw new Forbidden(SELF_REFUSAL);
  if (isStandInAccount(user.id)) throw new Forbidden(STAND_IN_REFUSAL);
  if (user.role === 'admin') await assertChangesOpen(session, admin);
  if (await findStandingUserAccessPause(user.id)) {
    throw fieldRefusal('userId', ALREADY_PAUSED);
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
 * The pause standing on a user's access, or `undefined`: what each signed-in request reads. Takes no session, as it decides
 * what the session may reach; it answers only for the account the session belongs to.
 */
export function standingAccessPause(userId: string): Promise<UserAccessPauseRow | undefined> {
  return findStandingUserAccessPause(userId);
}

/**
 * One page of every pause set on a user, standing, run out and lifted alike, newest first: the user modal's history.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} the id is malformed.
 */
export async function listUserAccessPauses(
  session: Session,
  userId: string,
  page: PageRequest,
): Promise<PageEntry<UserAccessPauseRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  return findUserAccessPausePage(admin, id, page);
}

/**
 * The pause standing on each user, in the order asked, undefined where none stands: one query for a page of the user list.
 * To a site admin alone.
 */
export async function standingAccessPausesOf(
  session: Session,
  userIds: readonly string[],
): Promise<(UserAccessPauseRow | undefined)[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const rows = await findStandingUserAccessPausesFor(admin, userIds);
  return userIds.map((id) => rows.find((row) => row.userId === id));
}
