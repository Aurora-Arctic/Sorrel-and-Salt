import 'server-only';
import {
  findStandingWorkspaceMemberPause,
  findStandingWorkspaceMemberPauses,
  findWorkspaceMemberPausePage,
  findWorkspaceRole,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, fieldRefusal } from '../../../lib/errors';
import { parseOptionalPauseMessage } from '../../../lib/pause-message';
import { isStandInAccount } from '../../../lib/system-actor';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { RowId } from '../../../lib/validation';
import type { MemberPauseNotifier, WorkspaceMemberPauseRow } from '../types';
import { mailPausedMember } from './member-pause-start';
import { assertMembership } from './membership';

// The coven access pause: a steward stops one member reaching their coven, until a time or with no end, and may lift it early.
// The member keeps the seat; `assertMembership` refuses them with AccessPaused while the pause stands
// (claude-docs/design-decisions/m15.55-coven-access-pause.md).

const NOTE_MAX_LENGTH = 500;
const OWNER_REFUSAL =
  "A steward's access can't be paused. Change their role first if they should be paused.";
const STAND_IN_REFUSAL = 'This account is not a person, so its access to a coven cannot be paused';
const ALREADY_PAUSED = 'This member is already paused; lift the pause first';
const STRANGER_REFUSAL = 'That person is not a member of this coven';
const PAST_END = 'Choose a time in the future';
const LONG_NOTE = `Keep the note to ${NOTE_MAX_LENGTH} characters`;

/**
 * The live seat `userId` holds in the proof's coven, refused as a stranger when there is none: an id that cannot name a user
 * included, as a wrong one is.
 */
async function memberRoleOf(workspaceId: string, userId: string) {
  if (!RowId.safeParse(userId).success) throw new Forbidden(STRANGER_REFUSAL);
  const role = await findWorkspaceRole(userId, workspaceId);
  if (!role) throw new Forbidden(STRANGER_REFUSAL);
  return role;
}

/**
 * Pauses a member's access to the coven until `until`, or with no end when `until` is `null`. The caller needs `member: pause`,
 * which only stewards hold; a steward cannot be paused, so the coven always keeps someone who can lift it. The member is mailed, with
 * `message` if one is written, once the pause is saved.
 *
 * @throws {Forbidden} the caller is not a steward of the coven; `userId` holds no seat in it; `userId` is a steward; or `userId` is
 * the System account or the signed-out sender account, which are not people.
 * @throws {AccessPaused} the caller's own access to the coven is paused.
 * @throws {ValidationError} `until` is not in the future, the note or the message is over 500 characters, or a pause
 * already stands.
 */
export async function pauseMemberAccess(
  session: Session,
  workspaceId: string,
  userId: string,
  until: Date | null | undefined,
  note: string | null | undefined,
  notifier: MemberPauseNotifier,
  message?: string | null,
): Promise<WorkspaceMemberPauseRow> {
  const membership = await assertMembership(session, workspaceId, { member: ['pause'] });
  const trimmed = note?.trim() || null;
  if (
    until != null &&
    (!(until instanceof Date) || Number.isNaN(until.getTime()) || until.getTime() <= Date.now())
  ) {
    throw fieldRefusal('until', PAST_END);
  }
  if (trimmed && trimmed.length > NOTE_MAX_LENGTH) {
    throw fieldRefusal('note', LONG_NOTE);
  }
  const toMember = parseOptionalPauseMessage(message);
  if (isStandInAccount(userId)) throw new Forbidden(STAND_IN_REFUSAL);
  if ((await memberRoleOf(membership.workspaceId, userId)) === 'owner') {
    throw new Forbidden(OWNER_REFUSAL);
  }
  if (await findStandingWorkspaceMemberPause(membership, userId)) {
    throw fieldRefusal('userId', ALREADY_PAUSED);
  }
  const pause = await withAudit(session, async (write) => {
    const [row] = await write.setWorkspaceMemberPause(membership, userId, {
      until: until ?? null,
      note: trimmed,
      message: toMember,
    });
    // An empty answer is a pause another steward set in the same moment, which took the one live slot.
    if (!row) throw fieldRefusal('userId', ALREADY_PAUSED);
    return row;
  });
  // The pause is saved, so a mail that cannot start or send is logged by the start and never thrown.
  try {
    await mailPausedMember(pause.id, await notifier.origin());
  } catch (error) {
    // oxlint-disable-next-line no-console -- the log is how a failed send is seen
    console.error('Could not start a coven access pause notice', error);
  }
  return pause;
}

/**
 * Lifts the pause standing on a member's access to the coven now, and answers it. Stewards only, as setting one is.
 *
 * @throws {Forbidden} the caller is not a steward of the coven, or `userId` holds no seat in it.
 * @throws {AccessPaused} the caller's own access to the coven is paused.
 * @throws {NotFound} no pause stands on the member: none set, lifted already, or run out.
 */
export async function liftMemberAccessPause(
  session: Session,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMemberPauseRow> {
  const membership = await assertMembership(session, workspaceId, { member: ['pause'] });
  await memberRoleOf(membership.workspaceId, userId);
  const [row] = await withAudit(session, (write) =>
    write.liftWorkspaceMemberPause(membership, userId),
  );
  if (!row) throw new NotFound('No pause stands on this member');
  return row;
}

/**
 * The pauses standing on any of `userIds` in the coven, at most one each: what the members page reads to show each row's
 * state. Stewards only, as setting one is. An id that cannot name a user is left out.
 *
 * @throws {Forbidden} the caller is not a steward of the coven.
 * @throws {AccessPaused} the caller's own access to the coven is paused.
 */
export async function standingMemberPauses(
  session: Session,
  workspaceId: string,
  userIds: readonly string[],
): Promise<WorkspaceMemberPauseRow[]> {
  const membership = await assertMembership(session, workspaceId, { member: ['pause'] });
  const ids = userIds.filter((id) => RowId.safeParse(id).success);
  return findStandingWorkspaceMemberPauses(membership, ids);
}

/**
 * One page of every pause set on a member of the coven, standing, run out and lifted alike, newest first. Stewards only. A
 * removed member's pauses are still answered, since the rows stay.
 *
 * @throws {Forbidden} the caller is not a steward of the coven, or `userId` cannot name a user.
 * @throws {AccessPaused} the caller's own access to the coven is paused.
 */
export async function listMemberPauses(
  session: Session,
  workspaceId: string,
  userId: string,
  page: PageRequest,
): Promise<PageEntry<WorkspaceMemberPauseRow>[]> {
  const membership = await assertMembership(session, workspaceId, { member: ['pause'] });
  if (!RowId.safeParse(userId).success) throw new Forbidden();
  return findWorkspaceMemberPausePage(membership, page, userId);
}
