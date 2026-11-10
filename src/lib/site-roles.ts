import type { UserRole } from './session';

/** The one place the curating roles are written. In `lib`, as the schema builder reads it and the identity module's index imports the builder back. */
export function curates(role: UserRole): boolean {
  return role === 'curator' || role === 'admin';
}

/** Change Role offers them in this order and reads a promotion by it; a keeper invitation is refused when the address holds the invited role or one above. */
export const SITE_ROLES: readonly UserRole[] = ['user', 'curator', 'admin'];

export function outranks(role: UserRole, other: UserRole): boolean {
  return SITE_ROLES.indexOf(role) > SITE_ROLES.indexOf(other);
}
