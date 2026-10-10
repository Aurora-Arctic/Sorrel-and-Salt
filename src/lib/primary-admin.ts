// Who the primary admin is: the live admin whose email matches
// ADMIN_BOOTSTRAP_EMAIL, read from the variable at each check rather than
// stored on the row, so the protection follows whatever it names now and a
// change needs no data fix (claude-docs/design-decisions/m2.9-granting-admin.md,
// "The primary admin"). Here rather than in auth.ts, since the role service
// asks it too and must not load Better Auth to do so.

/**
 * The variable's address, or `undefined` where it is unset. Required wherever
 * BETTER_AUTH_SECRET is, and for the same reason: every deploy runs at
 * NODE_ENV=production. Unset elsewhere, it names nobody.
 *
 * @throws {Error} unset at NODE_ENV=production.
 */
export function primaryAdminEmail(): string | undefined {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  if (!email && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is not set');
  }
  return email || undefined;
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
  "This is the primary admin and can't be removed. Changing who the primary admin is takes a change to the site's configuration.";

/**
 * Why a grant or revoke is refused while the primary admin has paused admin
 * changes (MB.63): the service's refusal and the words a locked Grant or
 * Revoke shows, one string so the two cannot drift. It names a role, not a
 * person (the owner's wording).
 */
export const ADMIN_CHANGES_PAUSED_REFUSAL = 'Admin changes are paused by the primary admin.';
