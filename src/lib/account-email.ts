// Pure helpers for /account/email?error=, the page a followed verification
// link lands on. Every sentence is ours: a code is what Better Auth's
// /verify-email appends to the link's callbackURL, and the page never shows
// one raw.

// Better Auth's own codes (node_modules/better-auth/dist/api/routes/
// email-verification.mjs, `redirectOnError`) plus the two src/lib/auth.ts
// adds on that endpoint.
const ERROR_MESSAGES: Record<string, string> = {
  SIGN_IN_TO_VERIFY: 'Open the link from a browser signed in to this account, then try it again.',
  EMAIL_TAKEN: "That address can't be used yet. Try again in a while, or choose another.",
  TOKEN_EXPIRED: 'That link has expired. Send a new one below.',
  INVALID_TOKEN: "That link didn't work. Send a new one below.",
  INVALID_USER:
    'That link belongs to a different account. Sign in to that account, then open it again.',
  USER_NOT_FOUND:
    'That link belongs to an account that no longer exists. Sign in again to start over.',
};

export const GENERIC_VERIFY_ERROR = "That link didn't work. Send a new one below.";

const EMAIL_PAGE = '/account/email';

/** Where a followed verification link lands: the email page in its confirmed view. */
export const VERIFIED_LANDING = `${EMAIL_PAGE}?verified=1`;

/** The email page, carrying where to go once the address is proved. */
export function emailPagePath(next: string): `/account/email?next=${string}` {
  return `${EMAIL_PAGE}?next=${encodeURIComponent(next)}`;
}

/** Whether a request path (with or without its query) is the email page itself. */
export function isEmailPage(path: string | undefined): boolean {
  return path?.split('?')[0] === EMAIL_PAGE;
}

/** One readable sentence for a `/verify-email` `?error=` code; `undefined` for none. */
export function verifyErrorMessage(code: string | string[] | undefined): string | undefined {
  if (typeof code !== 'string' || code.length === 0) return undefined;
  return ERROR_MESSAGES[code] ?? GENERIC_VERIFY_ERROR;
}
