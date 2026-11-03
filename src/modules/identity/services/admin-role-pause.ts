import 'server-only';
import { findOpenAdminRoleChangePause, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../../lib/primary-admin';
import type { Session } from '../../../lib/session';
import { assertSiteAdmin, type SiteAdmin } from './site-admin';
import { actsAsPrimaryAdmin } from './primary-admin';
import type { AdminRoleChangePauseState } from '../types';

// The primary keeper's switch on keeper grants and revokes, so a rogue admin can neither make keepers nor remove the good ones.
// Only the primary keeper may flip it; `setUserRole` reads it (claude-docs/auth/admin-users.md, "Pausing keeper changes").

const REFUSAL = 'Only a site keeper may see or change whether keeper changes are paused';
const NOT_PRIMARY_REFUSAL = 'Only the primary keeper may pause or resume keeper changes';

/**
 * Refuses a keeper change while the primary keeper has paused them, unless the
 * caller is the primary keeper, whom the pause exempts so it can clean up
 * without resuming first: the one guard the role service and coven
 * creation's approve and revoke both call.
 *
 * @throws {Forbidden} a pause is open and the caller is another keeper.
 */
export async function assertChangesOpen(session: Session, admin: SiteAdmin): Promise<void> {
  if (!(await findOpenAdminRoleChangePause(admin))) return;
  if (await actsAsPrimaryAdmin(session)) return;
  throw new Forbidden(ADMIN_CHANGES_PAUSED_REFUSAL);
}

/**
 * The site-role check, in `reason`'s words, then the pause's: the one guard
 * every keeper change opens with — a user's role, coven creation's approval
 * and its revoke, a keeper invitation and its withdrawal — answering the
 * proof the change writes under.
 *
 * @throws {Forbidden} the session's role is not `admin`, or a pause is open
 * and the caller is another keeper.
 */
export async function assertAdminChangesOpen(session: Session, reason: string): Promise<SiteAdmin> {
  const admin = assertSiteAdmin(session, reason);
  await assertChangesOpen(session, admin);
  return admin;
}

/** The site-role check, then the primary keeper's: who may flip the switch. */
async function assertPrimaryAdmin(session: Session): Promise<SiteAdmin> {
  const admin = assertSiteAdmin(session, REFUSAL);
  if (!(await actsAsPrimaryAdmin(session))) throw new Forbidden(NOT_PRIMARY_REFUSAL);
  return admin;
}

/**
 * Whether keeper changes are paused, and whether the session's admin may
 * switch that: what `/keepers/users` states beside its control, to any keeper.
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
 * Pauses keeper grants and revokes for every keeper but the primary one,
 * stamped as the primary keeper, and answers `true`, paused. A pause already
 * open is left as it is, so a second click changes nothing.
 *
 * @throws {Forbidden} the session's user is not the primary keeper.
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
 * @throws {Forbidden} the session's user is not the primary keeper.
 */
export async function resumeAdminRoleChanges(session: Session): Promise<boolean> {
  const admin = await assertPrimaryAdmin(session);
  await withAudit(session, (write) => write.resumeAdminRoleChanges(admin));
  return false;
}
