import type { UserRole } from './session';

/**
 * Whether a site role curates: `curator` or `admin`. The one place
 * the curating roles are written down, read by `assertCurator`, the GraphQL
 * `curator` scope and the shell's Admin link. In `lib` rather than the identity
 * module because the schema builder reads it, and the module's index imports
 * the builder back.
 */
export function curates(role: UserRole): boolean {
  return role === 'curator' || role === 'admin';
}

/**
 * The site roles from least to most: each holds what the one before it does,
 * and more. Change Role offers them in this order and reads a promotion by
 * it; an admin invitation is refused, and its acceptance grants nothing, when
 * the address holds the invited role or one above it.
 */
export const SITE_ROLES: readonly UserRole[] = ['user', 'curator', 'admin'];

/** Whether `role` stands above `other` on `SITE_ROLES`. */
export function outranks(role: UserRole, other: UserRole): boolean {
  return SITE_ROLES.indexOf(role) > SITE_ROLES.indexOf(other);
}
