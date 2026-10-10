import 'server-only';
import { findOneById, findOpenAdminRoleChangePause, withAudit } from '../../../db/repository';
import type { AuditWriter, PrivilegeDeclaration } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import {
  ADMIN_CHANGES_PAUSED_REFUSAL,
  PRIMARY_ADMIN_REFUSAL,
  primaryAdminEmail,
  sameAddress,
} from '../../../lib/primary-admin';
import type { Session, UserRole } from '../../../lib/session';
import { users } from '../schema/users';
import { assertSiteAdmin, type SiteAdmin } from './site-admin';
import type { UserRow } from '../types';

// MB.59: an admin makes a user an admin, or stops one being one, from
// `/admin/users`. Each change is declared `via: 'admin'` and the trigger on
// `users` records it in the privilege ledger (MB.195); the service writes no
// ledger row. Why each rule is what it is:
// claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin",
// "Granting" and "Revoking"; the shape is claude-docs/auth/admin-users.md,
// "Granting and revoking admin".

const REFUSAL = 'Only a site admin may change who is an admin';

/**
 * Whether `user` is the primary admin: a live admin whose email matches
 * ADMIN_BOOTSTRAP_EMAIL as it reads now. Nobody is while it is unset.
 */
export function isPrimaryAdmin(user: Pick<UserRow, 'email' | 'role' | 'deletedAt'>): boolean {
  const email = primaryAdminEmail();
  return (
    email !== undefined &&
    user.role === 'admin' &&
    user.deletedAt === null &&
    sameAddress(user.email, email)
  );
}

/** Whether the session's user is the primary admin, read off their own live row. */
export async function actsAsPrimaryAdmin(session: Session): Promise<boolean> {
  const self = await findOneById(users, session.userId);
  return self !== undefined && isPrimaryAdmin(self);
}

/**
 * Refuses a role change while the primary admin has paused them (MB.63),
 * unless the caller is the primary admin, whom the pause exempts so it can
 * clean up without resuming first.
 */
async function assertChangesOpen(session: Session, admin: SiteAdmin): Promise<void> {
  if (!(await findOpenAdminRoleChangePause(admin))) return;
  if (await actsAsPrimaryAdmin(session)) return;
  throw new Forbidden(ADMIN_CHANGES_PAUSED_REFUSAL);
}

/** The live user, or `NotFound`: a soft-deleted one reads as no one. */
async function liveUser(userId: string): Promise<UserRow> {
  const user = await findOneById(users, userId);
  if (!user) throw new NotFound('No such user');
  return user;
}

/**
 * The role write every route to admin shares, inside the caller's
 * transaction: a grant sets the creation flag too, since the users CHECK
 * refuses an admin without it (MB.177), and a revoke leaves it, the grant
 * having been a vouching too. A revoke first locks the live admins and counts
 * them, so two revokes at once cannot leave none.
 */
async function writeRole(
  write: AuditWriter,
  admin: SiteAdmin,
  user: UserRow,
  role: UserRole,
): Promise<UserRow> {
  if (role === 'user') {
    const admins = await write.lockLiveAdmins(admin);
    // Read again under the lock: a revoke that committed while this one
    // waited has already taken its row out.
    const target = admins.find((row) => row.id === user.id);
    if (!target) throw new Forbidden(`${user.name} is not an admin, so there is nothing to revoke`);
    if (isPrimaryAdmin(target)) throw new Forbidden(PRIMARY_ADMIN_REFUSAL);
    if (admins.length === 1) {
      throw new Forbidden(
        `${user.name} is the last admin, and the site needs one. Make someone else an admin first.`,
      );
    }
  }
  const values = role === 'admin' ? { role, canCreateWorkspace: true } : { role };
  const [written] = await write.updateById(users, user.id, values);
  // Soft-deleted between the read and the write: the update matches no row,
  // so the trigger never fires and nothing is recorded.
  if (!written) throw new NotFound('No such user');
  return written;
}

/**
 * Makes a live user an admin, or stops an admin being one, stamped as the
 * acting admin and recorded by the trigger with `note`, the confirmation's
 * optional reason, a blank one as none. Answers the row as written.
 *
 * @throws {Forbidden} the session's role is not `admin`; the user already
 * holds the role asked for, since the change would record nothing; the
 * revoke's target is the primary admin, for every caller, the primary admin
 * included; the revoke would leave no live admin; or the primary admin has
 * paused admin changes and the caller is another admin (MB.63).
 * @throws {NotFound} no live user has this id.
 */
export async function setUserRole(
  session: Session,
  userId: string,
  role: UserRole,
  note?: string,
): Promise<UserRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  await assertChangesOpen(session, admin);
  const user = await liveUser(userId);
  if (role === 'admin' && user.role === 'admin') {
    throw new Forbidden(`${user.name} is already an admin`);
  }
  if (role === 'user' && user.role !== 'admin') {
    throw new Forbidden(`${user.name} is not an admin, so there is nothing to revoke`);
  }
  const declaration: PrivilegeDeclaration = { via: 'admin', note: note?.trim() || undefined };
  return withAudit(session, (write) => writeRole(write, admin, user, role), declaration);
}
