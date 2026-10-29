import { createHmac } from 'node:crypto';
import { plainSessionCookie } from './slots';

// The session cookie's name and signature, in a file of their own so that
// database.ts can build one without importing session.ts, which imports
// database.ts.

// A production build's base URL forces https (src/lib/auth.ts, "baseURL"), so Better Auth names the cookie
// with `__Secure-`; the audit starts its servers without it (E2E_PLAIN_SESSION_COOKIE, playwright.config.ts).
export const SESSION_COOKIE = plainSessionCookie
  ? 'better-auth.session_token'
  : '__Secure-better-auth.session_token';

/** better-call's `signCookieValue`: `<value>.<base64 HMAC-SHA256>`, percent-encoded. */
export function signed(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return encodeURIComponent(`${value}.${signature}`);
}
