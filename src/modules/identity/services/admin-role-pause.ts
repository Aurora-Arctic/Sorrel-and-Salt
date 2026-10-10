import 'server-only';
import { findOpenAdminRoleChangePause, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../../lib/primary-admin';
import type { Session } from '../../../lib/session';
import { assertSiteAdmin, type SiteAdmin } from './site-admin';
import { actsAsPrimaryAdmin } from './primary-admin';
import type { AdminRoleChangePauseState } from '../types';

// MB.63: the primary admin's switch on admin grants and revokes, so a rogue
// admin can neither make admins nor remove the good ones while it is dealt
// with. Only the primary admin may flip it, being the one account a rogue
// admin cannot become; `setUserRole` reads it. Each pause is a row of MB.62's
// ledger, opened and ended through the writer's named calls, stamped from the
// session (claude-docs/auth/admin-users.md, "Pausing admin changes").

const REFUSAL = 'Only a site admin may see or change whether admin changes are paused';
const NOT_PRIMARY_REFUSAL = 'Only the primary admin may pause or resume admin changes';

/**
 * Refuses an admin change while the primary admin has paused them, unless the
 * caller is the primary admin, whom the pause exempts so it can clean up
 * without resuming first: the one guard the role service and coven
 * creation's approve and revoke both call (MB.63; the latter amended
 * 2026-10-10, on the owner's call).
 *
 * @throws {Forbidden} a pause is open and the caller is another admin.
 */
export async function assertChangesOpen(session: Session, admin: SiteAdmin): Promise<void> {
  if (!(await findOpenAdminRoleChangePause(admin))) return;
  if (await actsAsPrimaryAdmin(session)) return;
  throw new Forbidden(ADMIN_CHANGES_PAUSED_REFUSAL);
}

/**
 * The site-role check, in `reason`'s words, then the pause's: the one guard
 * every admin change opens with — a user's role, coven creation's approval
 * and its revoke, an admin invitation and its withdrawal — answering the
 * proof the change writes under.
 *
 * @throws {Forbidden} the session's role is not `admin`, or a pause is open
 * and the caller is another admin.
 */
export async function assertAdminChangesOpen(session: Session, reason: string): Promise<SiteAdmin> {
  const admin = assertSiteAdmin(session, reason);
  await assertChangesOpen(session, admin);
  return admin;
}

/** The site-role check, then the primary admin's: who may flip the switch. */
async function assertPrimaryAdmin(session: Session): Promise<SiteAdmin> {
  const admin = assertSiteAdmin(session, REFUSAL);
  if (!(await actsAsPrimaryAdmin(session))) throw new Forbidden(NOT_PRIMARY_REFUSAL);
  return admin;
}

/**
 * Whether admin changes are paused, and whether the session's admin may
 * switch that: what `/admin/users` states beside its control, to any admin.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function adminRoleChangePauseState(
  session: Session,
): Promise<AdminRoleChangePauseState> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const [open, canToggle] = await Promise.all([
    findOpenAdminRoleChangePause(admin),
    actsAsPrimaryAdmin(session),
  ]);
  return { paused: open !== undefined, canToggle };
}

/**
 * Pauses admin grants and revokes for every admin but the primary one,
 * stamped as the primary admin, and answers `true`, paused. A pause already
 * open is left as it is, so a second click changes nothing.
 *
 * @throws {Forbidden} the session's user is not the primary admin.
 */
export async function pauseAdminRoleChanges(session: Session): Promise<boolean> {
  const admin = await assertPrimaryAdmin(session);
  await withAudit(session, (write) => write.pauseAdminRoleChanges(admin));
  return true;
}

/**
 * Ends the open pause, stamping who ended it and when, and answers `false`,
 * not paused. With none open it writes nothing.
 *
 * @throws {Forbidden} the session's user is not the primary admin.
 */
export async function resumeAdminRoleChanges(session: Session): Promise<boolean> {
  const admin = await assertPrimaryAdmin(session);
  await withAudit(session, (write) => write.resumeAdminRoleChanges(admin));
  return false;
}
