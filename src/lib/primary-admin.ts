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
