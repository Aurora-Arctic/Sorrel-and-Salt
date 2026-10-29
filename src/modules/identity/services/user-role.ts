import 'server-only';
import { withAudit } from '../../../db/repository';
import type { AuditWriter } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import { PRIMARY_ADMIN_REFUSAL } from '../../../lib/primary-admin';
import type { Session, UserRole } from '../../../lib/session';
import { users } from '../schema/users';
import { adminDeclaration, liveUser } from './admin-changes';
import { assertAdminChangesOpen } from './admin-role-pause';
import { isPrimaryAdmin } from './primary-admin';
import type { SiteAdmin } from './site-admin';
import type { UserRow } from '../types';

// MB.59, M11.20: an admin sets a user's site role, `user`, `curator` or
// `admin`, from `/admin/users`. Each change is declared `via: 'admin'` and
// the trigger on `users` records it in the privilege ledger; the
// service writes no ledger row. Why each rule is what it is:
// claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin",
// "Granting" and "Revoking", and m11.20-curator-role.md; the shape is
// claude-docs/auth/admin-users.md, "Changing a site role".

const REFUSAL = 'Only a site admin may change a site role';

/** The role's name in a refusal: "already a curator". */
const ROLE_NOUNS: Record<UserRole, string> = {
  user: 'a user',
  curator: 'a curator',
  admin: 'an admin',
};

/**
 * The grant of a curating role every route but the bootstrap shares, inside
 * the caller's transaction: the creation flag too, since the users CHECK
 * refuses a curator or an admin without it. An admin's role
 * change and an accepted site invitation both write it; the route is
 * the caller's declaration.
 */
export function writeSiteRoleGrant(
  write: AuditWriter,
  userId: string,
  role: 'curator' | 'admin',
): Promise<UserRow[]> {
  return write.updateById(users, userId, { role, canCreateWorkspace: true });
}

/**
 * The role write, inside the caller's transaction. Leaving `admin`, for
 * `curator` or `user`, is a revoke of admin: it first locks the live admins
 * and counts them, so two revokes at once cannot leave none. Moving to
 * `user` leaves the flag, the grant having been a vouching too.
 */
async function writeRole(
  write: AuditWriter,
  admin: SiteAdmin,
  user: UserRow,
  role: UserRole,
): Promise<UserRow> {
  if (user.role === 'admin') {
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
  const [written] =
    role === 'user'
      ? await write.updateById(users, user.id, { role })
      : await writeSiteRoleGrant(write, user.id, role);
  // Soft-deleted between the read and the write: the update matches no row,
  // so the trigger never fires and nothing is recorded.
  if (!written) throw new NotFound('No such user');
  return written;
}

/**
 * Gives a live user a site role, stamped as the acting admin and recorded by
 * the trigger with `note`, the confirmation's optional reason, a blank one as
 * none. Answers the row as written.
 *
 * @throws {Forbidden} the session's role is not `admin`, a curator's
 * included; the user already holds the role asked for, since the change
 * would record nothing; the user is the primary admin and the role is not
 * `admin`, for every caller, the primary admin included; the change would
 * leave no live admin; or the primary admin has paused admin changes and the
 * caller is another admin.
 * @throws {NotFound} no live user has this id.
 */
export async function setUserRole(
  session: Session,
  userId: string,
  role: UserRole,
  note?: string,
): Promise<UserRow> {
  const admin = await assertAdminChangesOpen(session, REFUSAL);
  const user = await liveUser(userId);
  if (user.role === role) throw new Forbidden(`${user.name} is already ${ROLE_NOUNS[role]}`);
  return withAudit(session, (write) => writeRole(write, admin, user, role), adminDeclaration(note));
}
