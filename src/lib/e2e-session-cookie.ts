/**
 * Whether Better Auth names its cookies without the `__Secure-` prefix: the
 * flag set, and no deploy target at all. A production build forces an https
 * base URL, which makes the prefix automatic, and WebKit never sends a
 * `__Secure-` cookie to the plain-http origin an e2e browser reaches the
 * server on. Only the e2e servers started for the audit set the flag
 * (`playwright.config.ts`, under `E2E_AUDIT=1`).
 * Any `VERCEL_ENV` overrides it, preview and development included, so no
 * deploy can drop the prefix (claude-docs/testing/e2e.md, "A signed-in
 * browser without a provider").
 */
export function plainSessionCookie(env: Record<string, string | undefined> = process.env): boolean {
  return env.E2E_PLAIN_SESSION_COOKIE === 'true' && !env.VERCEL_ENV;
}
