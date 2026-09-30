import { POST_SIGN_IN_LANDING, safeReturnPath } from './sign-in';

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

const VERIFIED_LANDING = `${EMAIL_PAGE}?verified`;

/**
 * Where a followed verification link lands: the email page in its confirmed
 * view, carrying `next` on to Continue once it has passed `safeReturnPath`.
 * The landing Continue falls back to is left off, so a link with nowhere else
 * to go reads as it always has.
 */
export function verifiedLanding(next: string | undefined): string {
  const path = safeReturnPath(next);
  if (path === POST_SIGN_IN_LANDING) return VERIFIED_LANDING;
  return `${VERIFIED_LANDING}&next=${encodeURIComponent(path)}`;
}

/**
 * Where a verification link's `callbackURL` says the account was going. A
 * sign-up's is the sign-in's own destination; one on the email page — a
 * resend's landing, or a sign-in headed there — carries it as the page's
 * `next`, and the page itself is never the destination.
 */
export function returnPathOf(callbackURL: string | null): string | undefined {
  if (callbackURL === null) return undefined;
  if (!isEmailPage(callbackURL)) return callbackURL;
  return new URL(callbackURL, 'http://relative.invalid').searchParams.get('next') ?? undefined;
}

/**
 * Whether a request carries the confirmed-view flag. Read by presence: bare it
 * is `''`, and a URL rebuilt through URLSearchParams writes it back as
 * `?verified=`.
 */
export function hasVerifiedFlag(value: string | string[] | undefined): boolean {
  return value !== undefined;
}

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
