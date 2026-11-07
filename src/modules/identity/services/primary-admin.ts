import 'server-only';
import { findOneById } from '../../../db/repository';
import { primaryAdminEmail, sameAddress } from '../../../lib/primary-admin';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// Who the primary keeper is: read from ADMIN_BOOTSTRAP_EMAIL at each check, never stored (claude-docs/design-decisions/m2.9-granting-admin.md,
// "The primary keeper"). Its own file so the role service and the pause both ask it without importing each other.

/** Nobody is while ADMIN_BOOTSTRAP_EMAIL is unset. */
export function isPrimaryAdmin(user: Pick<UserRow, 'email' | 'role' | 'deletedAt'>): boolean {
  const email = primaryAdminEmail();
  return (
    email !== undefined &&
    user.role === 'admin' &&
    user.deletedAt === null &&
    sameAddress(user.email, email)
  );
}

export async function actsAsPrimaryAdmin(session: Session): Promise<boolean> {
  const self = await findOneById(users, session.userId);
  return self !== undefined && isPrimaryAdmin(self);
}
