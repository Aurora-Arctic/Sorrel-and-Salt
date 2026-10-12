import { userRole } from '@/modules/identity/schema/users';
import type { UserRole } from './session';

/**
 * A role Better Auth handed back, checked against the column's own enum.
 * Better Auth types the additional field as a plain string; reading an
 * unknown value as 'user' would hide whatever wrote it, so it throws. Its own
 * file rather than request-session.ts, which imports `auth` and so cannot be
 * imported back by it.
 *
 * @throws {Error} for a value the enum does not hold.
 */
export function toUserRole(role: unknown): UserRole {
  const known = userRole.enumValues.find((value) => value === role);
  if (known === undefined) throw new Error(`Unrecognised user role: ${String(role)}`);
  return known;
}
