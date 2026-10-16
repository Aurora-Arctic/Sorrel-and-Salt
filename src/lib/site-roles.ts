import type { UserRole } from './session';

/**
 * Whether a site role curates: `curator` or `admin` (M11.20). The one place
 * the curating roles are written down, read by `assertCurator`, the GraphQL
 * `curator` scope and the shell's Admin link. In `lib` rather than the identity
 * module because the schema builder reads it, and the module's index imports
 * the builder back.
 */
export function curates(role: UserRole): boolean {
  return role === 'curator' || role === 'admin';
}
