// The live keeper whose email matches ADMIN_BOOTSTRAP_EMAIL, read at each check and not stored on the row, so a change needs no data fix
// (claude-docs/design-decisions/m2.9-granting-admin.md, "The primary keeper"). Here, not in auth.ts, so the role service need not load Better Auth.
import { requiredInProduction } from './env';

/**
 * Required wherever BETTER_AUTH_SECRET is, as every deploy runs at NODE_ENV=production.
 * @throws {Error} unset at NODE_ENV=production.
 */
export function primaryAdminEmail(): string | undefined {
  return requiredInProduction('ADMIN_BOOTSTRAP_EMAIL');
}

export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** One string so the service's refusal and its row's words cannot drift. It names no variable; how to change who it is lives in the docs. */
export const PRIMARY_ADMIN_REFUSAL =
  "You can't revoke the primary keeper. The site's configuration sets who that is.";

/** One string so the service's refusal and a locked button's words cannot drift. It names a role, not a person. */
export const ADMIN_CHANGES_PAUSED_REFUSAL =
  'The primary keeper has paused keeper changes. Ask them to resume changes.';
