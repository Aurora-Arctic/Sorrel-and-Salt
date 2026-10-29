// The live admin whose email matches ADMIN_BOOTSTRAP_EMAIL, read at each check and not stored on the row, so a change needs no data fix
// (claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin"). Here, not in auth.ts, so the role service need not load Better Auth.
import { requiredInProduction } from './env';

/**
 * The variable's address, or `undefined` where unset. Required wherever BETTER_AUTH_SECRET is, as every deploy runs at
 * NODE_ENV=production; unset elsewhere it names nobody.
 *
 * @throws {Error} unset at NODE_ENV=production.
 */
export function primaryAdminEmail(): string | undefined {
  return requiredInProduction('ADMIN_BOOTSTRAP_EMAIL');
}

/** Whether the two addresses are one, compared as Better Auth stores them, lower-cased. */
export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Why the primary admin cannot be revoked, in plain words that name no
 * variable: the service's refusal and the words its row shows, one string so
 * the two cannot drift. How to change who it is lives in the docs, not the page.
 */
export const PRIMARY_ADMIN_REFUSAL =
  "You can't revoke the primary admin. The site's configuration sets who that is.";

/**
 * Why a grant or revoke is refused while the primary admin has paused admin changes: the service's refusal and a locked button's
 * words, one string so they cannot drift. It names a role, not a person.
 */
export const ADMIN_CHANGES_PAUSED_REFUSAL =
  'The primary admin has paused admin changes. Ask them to resume changes.';
