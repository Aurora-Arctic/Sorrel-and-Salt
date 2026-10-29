import { userRole } from '@/modules/identity/schema/users';
import type { UserRole } from './session';

/**
 * A role Better Auth handed back, checked against the column's enum: it types the field as a string, and reading an unknown value as 'user' would hide whatever wrote it.
 * Its own file, as request-session.ts imports `auth`. @throws {Error} for a value the enum does not hold.
 */
export function toUserRole(role: unknown): UserRole {
  const known = userRole.enumValues.find((value) => value === role);
  if (known === undefined) throw new Error(`Unrecognised user role: ${String(role)}`);
  return known;
}
