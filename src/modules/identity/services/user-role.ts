import 'server-only';
import { findDemoWorkspace, withAudit } from '../../../db/repository';
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

// An admin sets a user's site role from `/admin/users`. Each change is declared `via: 'admin'` and the trigger on `users` records it;
// the service writes no ledger row. Rules: claude-docs/design-decisions/m2.9-granting-admin.md and m11.20-curator-role.md;
// shape: claude-docs/auth/admin-users.md, "Changing a site role".

const REFUSAL = 'Only a site admin may change a site role';

/** The role's name in a refusal: "already a curator". */
const ROLE_NOUNS: Record<UserRole, string> = {
  user: 'a user',
  curator: 'a curator',
  admin: 'an admin',
};

/**
 * The grant of a curating role every route but the bootstrap shares, inside the caller's transaction. It sets the creation flag too,
 * since the users CHECK refuses a curator or an admin without it.
 */
export async function writeSiteRoleGrant(
  write: AuditWriter,
  userId: string,
  role: 'curator' | 'admin',
): Promise<UserRow[]> {
  const written = await write.updateById(users, userId, { role, canCreateWorkspace: true });
  // An admin owns the demo coven; the seat is written only when the role was, so a user gone between the read and the write gets none.
  if (role === 'admin' && written.length > 0) await seatDemoOwner(write, userId);
  return written;
}

/**
 * Seats the user as owner of the demo coven in the caller's transaction, doing nothing where there is no demo coven: a removed seat is
 * revived, a live one promoted, and a missing one inserted. Identity services hold no membership of that coven, so the writes take none.
 */
async function seatDemoOwner(write: AuditWriter, userId: string): Promise<void> {
  const demo = await findDemoWorkspace();
  if (!demo) return;
  const [revived] = await write.reviveMembership(demo.id, userId, 'owner', null);
  if (revived) return;
  const [promoted] = await write.setSeatRole(demo.id, userId, 'owner');
  if (!promoted) await write.insertMembership(demo.id, userId, 'owner');
}

/** Returns an admin's seat in the demo coven to a viewer's, in the caller's transaction; a user with no live seat is left without one. */
async function unseatDemoOwner(write: AuditWriter, userId: string): Promise<void> {
  const demo = await findDemoWorkspace();
  if (demo) await write.setSeatRole(demo.id, userId, 'viewer');
}

/**
 * The role write, inside the caller's transaction. Leaving `admin` first locks the live admins and counts them,
 * so two revokes at once cannot leave none. Moving to `user` leaves the flag.
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
  if (user.role === 'admin') await unseatDemoOwner(write, user.id);
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
