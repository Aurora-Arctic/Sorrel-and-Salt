/**
 * Whether Better Auth names its cookies without the `__Secure-` prefix: the
 * flag set, and no deploy target at all. A production build forces an https
 * base URL, which makes the prefix automatic, and a browser never sends a
 * `__Secure-` cookie to the plain-http origin an e2e browser reaches the
 * server on. Only the e2e servers set the flag
 * (`tests/e2e/servers.ts`), and under it `baseURL()` in src/lib/auth.ts gives
 * them a localhost base URL, the one plain-http host a browser lets use a passkey.
 * Any `VERCEL_ENV` overrides it, preview and development included, so no
 * deploy can drop the prefix (claude-docs/testing/e2e.md, "A signed-in
 * browser without a provider").
 */
export function plainSessionCookie(env: Record<string, string | undefined> = process.env): boolean {
  return env.E2E_PLAIN_SESSION_COOKIE === 'true' && !env.VERCEL_ENV;
}
