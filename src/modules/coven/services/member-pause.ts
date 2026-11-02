import 'server-only';
import {
  findStandingWorkspaceMemberPause,
  findWorkspaceRole,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import type { WorkspaceMemberPauseRow } from '../types';
import { assertMembership } from './membership';

// The coven access pause: an owner stops one member reaching their coven, until a time or with no end, and may lift it early.
// The member keeps the seat; `assertMembership` refuses them with AccessPaused while the pause stands
// (claude-docs/design-decisions/m15.55-coven-access-pause.md).

const NOTE_MAX_LENGTH = 500;
const OWNER_REFUSAL =
  "An owner's access can't be paused. Change their role first if they should be paused.";
const ALREADY_PAUSED = 'This member is already paused; lift the pause first';

/**
 * The live seat `userId` holds in the proof's coven, refused as a stranger when there is none: an id that cannot name a user
 * included, as a wrong one is.
 */
async function memberRoleOf(workspaceId: string, userId: string) {
  if (!RowId.safeParse(userId).success) throw new Forbidden();
  const role = await findWorkspaceRole(userId, workspaceId);
  if (!role) throw new Forbidden('That person is not a member of this coven');
  return role;
}

/**
 * Pauses a member's access to the coven until `until`, or with no end when `until` is `null`. The caller needs `member: pause`,
 * which only owners hold; an owner cannot be paused, so the coven always keeps someone who can lift it.
 *
 * @throws {Forbidden} the caller is not an owner of the coven; `userId` holds no seat in it; or `userId` is an owner.
 * @throws {AccessPaused} the caller's own access to the coven is paused.
 * @throws {ValidationError} `until` is not in the future, the note is over 500 characters, or a pause already stands.
 */
export async function pauseMemberAccess(
  session: Session,
  workspaceId: string,
  userId: string,
  until: Date | null | undefined,
  note: string | null | undefined,
): Promise<WorkspaceMemberPauseRow> {
  const membership = await assertMembership(session, workspaceId, { member: ['pause'] });
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
  if ((await memberRoleOf(membership.workspaceId, userId)) === 'owner') {
    throw new Forbidden(OWNER_REFUSAL);
  }
  if (await findStandingWorkspaceMemberPause(membership, userId)) {
    throw new ValidationError([{ path: ['userId'], message: ALREADY_PAUSED }]);
  }
  return withAudit(session, async (write) => {
    const [row] = await write.setWorkspaceMemberPause(membership, userId, {
      until: until ?? null,
      note: trimmed,
    });
    // An empty answer is a pause another owner set in the same moment, which took the one live slot.
    if (!row) throw new ValidationError([{ path: ['userId'], message: ALREADY_PAUSED }]);
    return row;
  });
}

/**
 * Lifts the pause standing on a member's access to the coven now, and answers it. Owners only, as setting one is.
 *
 * @throws {Forbidden} the caller is not an owner of the coven, or `userId` holds no seat in it.
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
