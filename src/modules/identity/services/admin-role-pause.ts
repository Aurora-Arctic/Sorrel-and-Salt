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
 * The primary keeper's own change passes, so it can clean up without resuming.
 *
 *
 * @throws {Forbidden} a pause is open and the caller is another keeper.
 */
export async function assertChangesOpen(session: Session, admin: SiteAdmin): Promise<void> {
  if (!(await findOpenAdminRoleChangePause(admin))) return;
  if (await actsAsPrimaryAdmin(session)) return;
  throw new Forbidden(ADMIN_CHANGES_PAUSED_REFUSAL);
}

/**
 * @throws {Forbidden} the session's role is not `admin`, or a pause is open and the caller is another keeper.
 */
export async function assertAdminChangesOpen(session: Session, reason: string): Promise<SiteAdmin> {
  const admin = assertSiteAdmin(session, reason);
  await assertChangesOpen(session, admin);
  return admin;
}

async function assertPrimaryAdmin(session: Session): Promise<SiteAdmin> {
  const admin = assertSiteAdmin(session, REFUSAL);
  if (!(await actsAsPrimaryAdmin(session))) throw new Forbidden(NOT_PRIMARY_REFUSAL);
  return admin;
}

/**
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
 * A pause already open is left as it is.
 *
 * @throws {Forbidden} the session's user is not the primary keeper.
 */
export async function pauseAdminRoleChanges(session: Session): Promise<boolean> {
  const admin = await assertPrimaryAdmin(session);
  await withAudit(session, (write) => write.pauseAdminRoleChanges(admin));
  return true;
}

/**
 * With none open it writes nothing.
 *
 * @throws {Forbidden} the session's user is not the primary keeper.
 */
export async function resumeAdminRoleChanges(session: Session): Promise<boolean> {
  const admin = await assertPrimaryAdmin(session);
  await withAudit(session, (write) => write.resumeAdminRoleChanges(admin));
  return false;
}
