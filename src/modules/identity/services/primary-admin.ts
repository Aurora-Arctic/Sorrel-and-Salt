import 'server-only';
import { findOneById } from '../../../db/repository';
import { primaryAdminEmail, sameAddress } from '../../../lib/primary-admin';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// Who the primary admin is, asked of a row or of the session (MB.59): read
// from ADMIN_BOOTSTRAP_EMAIL at each check, never stored, so the protection
// follows whatever the variable names now
// (claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin").
// Its own file so the role service and the pause both ask it without either
// importing the other.

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
