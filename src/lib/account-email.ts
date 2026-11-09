import { messageLookup, safeReturnPath } from './sign-in';

// Pure helpers for /account/email?error=; a code is Better Auth's, and the page never shows one raw.

// Better Auth's own codes (node_modules/better-auth/dist/api/routes/
// email-verification.mjs, `redirectOnError`) plus the two src/lib/auth.ts
// adds on that endpoint.
const ERROR_MESSAGES: Record<string, string> = {
  SIGN_IN_TO_VERIFY: 'Open the link from a browser signed in to this account, then open it again.',
  EMAIL_TAKEN: "That email address can't be used yet. Try again in a while, or choose another.",
  TOKEN_EXPIRED: 'That link has expired. Send a new one below.',
  CHANGE_REPLACED:
    'A newer link replaced that one. Open the newest link we sent, or send a new one below.',
  INVALID_TOKEN: "That link didn't work. Send a new one below.",
  INVALID_USER:
    'That link belongs to a different account. Sign in to that account, then open it again.',
  USER_NOT_FOUND:
    'That link belongs to an account that no longer exists. Sign in again to start over.',
};

export const GENERIC_VERIFY_ERROR = "That link didn't work. Send a new one below.";

const EMAIL_PAGE = '/account/email';

const VERIFIED_LANDING = `${EMAIL_PAGE}?verified`;

// One segment after /invite/: the invitation page, which a link from an invitation lands on directly.
const INVITATION_PATH = /^\/invite\/[^/?#]+$/;

/** `next` is carried on to Continue only once it has passed `safeReturnPath`; an invitation is landed on itself, as Continue has nowhere else to go. */
export function verifiedLanding(next: string | undefined): string {
  const path = safeReturnPath(next);
  if (path === undefined) return VERIFIED_LANDING;
  if (INVITATION_PATH.test(path)) return path;
  return `${VERIFIED_LANDING}&next=${encodeURIComponent(path)}`;
}

/** A sign-up's callback is the sign-in's destination; one on the email page carries it as `next`, and the page itself is never the destination. */
export function returnPathOf(callbackURL: string | null): string | undefined {
  if (callbackURL === null) return undefined;
  if (!isEmailPage(callbackURL)) return callbackURL;
  return new URL(callbackURL, 'http://relative.invalid').searchParams.get('next') ?? undefined;
}

/** Read by presence: bare it is `''`, and a URL rebuilt through URLSearchParams writes it back as `?verified=`. */
export function hasVerifiedFlag(value: string | string[] | undefined): boolean {
  return value !== undefined;
}

export function emailPagePath(
  next: string | undefined,
): '/account/email' | `/account/email?next=${string}` {
  if (next === undefined) return EMAIL_PAGE;
  return `${EMAIL_PAGE}?next=${encodeURIComponent(next)}`;
}

export function isEmailPage(path: string | undefined): boolean {
  return path?.split('?')[0] === EMAIL_PAGE;
}

export const verifyErrorMessage = messageLookup(ERROR_MESSAGES, GENERIC_VERIFY_ERROR);
