/**
 * Whether Better Auth names its cookies without the `__Secure-` prefix: the
 * flag set, and no deploy target at all. A production build forces an https
 * base URL, which makes the prefix automatic, and a browser never sends a
 * `__Secure-` cookie to the plain-http origin an e2e browser reaches the
 * server on. Only the e2e servers set the flag
 * (`tests/e2e/servers.ts`).
 * Any `VERCEL_ENV` overrides it, preview and development included, so no
 * deploy can drop the prefix (claude-docs/testing/e2e.md, "A signed-in
 * browser without a provider").
 */
export function plainSessionCookie(env: Record<string, string | undefined> = process.env): boolean {
  return env.E2E_PLAIN_SESSION_COOKIE === 'true' && !env.VERCEL_ENV;
}

/**
 * The origins an e2e browser sends from, trusted beside the deployed hosts: a production build trusts only
 * those, so a sign-up or sign-in POST from `localhost` or the compose name `devcontainer` would be refused.
 * Each is on the server's own port, under the same flag and the same Vercel override as the cookie names.
 */
export function e2eTrustedOrigins(env: Record<string, string | undefined> = process.env): string[] {
  if (!plainSessionCookie(env) || !env.PORT) return [];
  return [`http://localhost:${env.PORT}`, `http://devcontainer:${env.PORT}`];
}
