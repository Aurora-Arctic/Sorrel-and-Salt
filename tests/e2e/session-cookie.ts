import { createHmac } from 'node:crypto';

// The session cookie's name and signature, in a file of their own so that
// database.ts can build one without importing session.ts, which imports
// database.ts.

// The e2e servers run a production build, whose base URL forces https and so would name the cookie with `__Secure-`;
// they start with E2E_PLAIN_SESSION_COOKIE (tests/e2e/servers.ts), so the name is plain and the cookie can sit in
// the browser's jar on a plain-http origin.
export const SESSION_COOKIE = 'better-auth.session_token';

/** better-call's `signCookieValue`: `<value>.<base64 HMAC-SHA256>`, percent-encoded. */
export function signed(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return encodeURIComponent(`${value}.${signature}`);
}
