import 'server-only';
import {
  findOneById,
  findStandingUserAccessPause,
  findStandingUserAccessPausesFor,
  findUserAccessPausePage,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, fieldRefusal } from '../../../lib/errors';
import { notifyAfterSave } from '../../../lib/mail-job';
import {
  parsePauseEnd,
  parsePauseNote,
  parseRequiredPauseMessage,
} from '../../../lib/pause-message';
import { isStandInAccount } from '../../../lib/system-actor';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import type { AccessPauseNotifier, UserAccessPauseRow } from '../types';
import { assertChangesOpen } from './admin-role-pause';
import { isPrimaryAdmin } from './primary-admin';
import { mailPausedUser } from './access-pause-start';
import { assertSiteAdmin } from './site-admin';
import { NO_SUCH_USER } from './admin-changes';

// Setting one ends every session the user holds; every signed-in request reads `standingAccessPause` through
// src/lib/request-session.ts (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access").

const REFUSAL = 'Only a site keeper may pause or lift a user’s access';
const PRIMARY_REFUSAL = 'The primary keeper’s access cannot be paused';
const SELF_REFUSAL = 'You cannot pause your own access';
const STAND_IN_REFUSAL = 'This account is not a person, so its access cannot be paused';
const ALREADY_PAUSED = 'This user is already paused; lift the pause first';

/**
 * Ends every session the user holds; the mail goes once the pause is saved (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access").
 *
 * @throws {Forbidden} not a keeper; the user is the primary keeper, the caller, or the System or signed-out sender account; or keeper changes are paused and the user is a keeper.
 * @throws {NotFound} no live user has this id.
 * @throws {ValidationError} `until` is not in the future, the note or message is missing, blank or over 500 characters, or a pause already stands.
 */
export async function pauseUserAccess(
  session: Session,
  userId: string,
  until: Date | null | undefined,
  note: string | null | undefined,
  notifier: AccessPauseNotifier,
  message: string,
): Promise<UserAccessPauseRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  parsePauseEnd(until);
  const trimmed = parsePauseNote(note, { required: true });
  const toUser = parseRequiredPauseMessage(message);
  const user = await findOneById(users, id);
  if (!user) throw new NotFound(NO_SUCH_USER);
  if (isPrimaryAdmin(user)) throw new Forbidden(PRIMARY_REFUSAL);
  if (user.id === session.userId) throw new Forbidden(SELF_REFUSAL);
  if (isStandInAccount(user.id)) throw new Forbidden(STAND_IN_REFUSAL);
  if (user.role === 'admin') await assertChangesOpen(session, admin);
  if (await findStandingUserAccessPause(user.id)) {
    throw fieldRefusal('userId', ALREADY_PAUSED);
  }
  const pause = await withAudit(session, async (write) => {
    const [row] = await write.setUserAccessPause(admin, user.id, {
      until: until ?? null,
      note: trimmed,
      message: toUser,
    });
    // An empty answer is a pause another keeper set in the same moment, which took the one live slot.
    if (!row) {
      throw fieldRefusal('userId', ALREADY_PAUSED);
    }
    return row;
  });
  // The pause is saved, so a mail that cannot start or send is logged by the start and never thrown.
  await notifyAfterSave(
    async () => mailPausedUser(pause.id, await notifier.origin()),
    'an access pause notice',
  );
  return pause;
}

/**
 * @throws {Forbidden} the session is not a keeper.
 * @throws {NotFound} no live user has this id, or no pause stands on them: lifted already, or run out.
 */
export async function liftUserAccessPause(
  session: Session,
  userId: string,
): Promise<UserAccessPauseRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  if (!(await findOneById(users, id))) throw new NotFound(NO_SUCH_USER);
  const [row] = await withAudit(session, (write) => write.liftUserAccessPause(admin, id));
  if (!row) throw new NotFound('No pause stands on this user');
  return row;
}

/** Takes no session, as it decides what the session may reach; it answers only for the account the session belongs to. */
export function standingAccessPause(userId: string): Promise<UserAccessPauseRow | undefined> {
  return findStandingUserAccessPause(userId);
}

/**
 * @throws {Forbidden} the caller is not a site keeper.
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

/** In the order asked, undefined where none stands; to a site keeper alone. */
export async function standingAccessPausesOf(
  session: Session,
  userIds: readonly string[],
): Promise<(UserAccessPauseRow | undefined)[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const rows = await findStandingUserAccessPausesFor(admin, userIds);
  return userIds.map((id) => rows.find((row) => row.userId === id));
}
