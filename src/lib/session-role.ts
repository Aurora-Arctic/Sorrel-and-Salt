import { userRole } from '@/modules/identity/schema/users';
import type { UserRole } from './session';

/**
 * A role Better Auth handed back, checked against the column's enum. Better Auth types the field as a plain string, and reading an unknown value as 'user'
 * would hide whatever wrote it, so it throws. Its own file, as request-session.ts imports `auth` and cannot be imported back.
 *
 * @throws {Error} for a value the enum does not hold.
 */
export function toUserRole(role: unknown): UserRole {
  const known = userRole.enumValues.find((value) => value === role);
  if (known === undefined) throw new Error(`Unrecognised user role: ${String(role)}`);
  return known;
}
