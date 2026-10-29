import type { UserRole } from './session';

/**
 * Whether a site role curates: `curator` or `admin`. The one place the curating roles are written, read by `assertCurator`, the GraphQL `curator` scope and the
 * Admin link. In `lib`, as the schema builder reads it and the identity module's index imports the builder back.
 */
export function curates(role: UserRole): boolean {
  return role === 'curator' || role === 'admin';
}

/**
 * The site roles from least to most, each holding what the one before does. Change Role offers them in this order and reads a promotion by it; an admin invitation
 * is refused when the address holds the invited role or one above.
 */
export const SITE_ROLES: readonly UserRole[] = ['user', 'curator', 'admin'];

/** Whether `role` stands above `other` on `SITE_ROLES`. */
export function outranks(role: UserRole, other: UserRole): boolean {
  return SITE_ROLES.indexOf(role) > SITE_ROLES.indexOf(other);
}
