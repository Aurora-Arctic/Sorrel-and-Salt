import type { Route } from 'next';
import type { UserRole } from './session';

// Pure helpers for /sign-in?next=&error=, shared by the sign-in page and route protection (src/proxy.ts,
// src/lib/request-session.ts): one rule for which return paths are safe, plus the account page's OAuth round-trip sentences.

/**
 * Where a sign-in goes when no page asked for the visitor back, for anyone but a curator or an admin: the post-sign-in
 * landing, not the public front door `/` (claude-docs/design-decisions/auth.md, "Where the post-sign-in landing lives").
 */
export const POST_SIGN_IN_LANDING = '/coven' satisfies Route;

export const ADMIN_LANDING = '/keepers' satisfies Route;

export const CURATOR_LANDING = '/curator' satisfies Route;

export function postSignInLanding(role: UserRole): Route {
  if (role === 'admin') return ADMIN_LANDING;
  return role === 'curator' ? CURATOR_LANDING : POST_SIGN_IN_LANDING;
}

/** The auth pages: coming back to one after signing in would show the form again, so none is a return path. */
const AUTH_PAGE = /^\/(?:sign-in|forgot-password|reset-password)(?:[/?#]|$)/;

/** The open-redirect guard for `?next=`: without it `?next=https://evil.example` would redirect anywhere after sign-in. */
export function safeReturnPath(raw: string | string[] | undefined): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  // A single leading slash, not a second slash or backslash right after it —
  // both are how a URL parser can be tricked into reading the rest as a host.
  if (!/^\/(?!\/|\\)/.test(raw)) return undefined;
  // A backslash anywhere: browsers read it as a slash in a URL.
  if (raw.includes('\\')) return undefined;
  if (AUTH_PAGE.test(raw)) return undefined;
  // A newline anywhere would let this value smuggle a second header into
  // whatever eventually turns it into a redirect response.
  if (/[\r\n]/.test(raw)) return undefined;
  return raw;
}

/** A flag, not a landing path: `/coven` asked for by name must still win for a keeper. */
export const NO_RETURN_PATH = { noReturnPath: true } as const;

/** With none, `callbackURL` is only what Better Auth requires, since the callback replaces it, and a failed attempt keeps asking for none. */
export function socialSignInTarget(next: string | undefined) {
  if (next === undefined) {
    return {
      callbackURL: POST_SIGN_IN_LANDING,
      errorCallbackURL: signInPath(undefined),
      additionalData: NO_RETURN_PATH,
    };
  }
  return { callbackURL: next, errorCallbackURL: signInPath(next) };
}

/**
 * The request header the proxy forwards a protected page's own path and query in, as a server component cannot read its URL
 * and `requireSession()` needs it to redirect. The proxy overwrites any client value; `safeReturnPath` still guards the read.
 */
export const RETURN_PATH_HEADER = 'x-sorrel-return-path';

export const SIGN_IN_TO_VERIFY_PATH = '/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify';

/** Passed to the server plugin and the client one alike, which must agree on it. */
export const LAST_USED_PROVIDER_COOKIE = 'better-auth.last_used_login_method';

export function signInPath(returnPath: string | undefined): '/sign-in' | `/sign-in?next=${string}` {
  const path = safeReturnPath(returnPath);
  if (path === undefined) return '/sign-in';
  return `/sign-in?next=${encodeURIComponent(path)}`;
}

/** Next hands a repeated key over as an array, which is no code. */
export function messageLookup(
  messages: Readonly<Record<string, string>>,
  generic: string,
): (code: string | string[] | undefined) => string | undefined {
  return (code) => {
    if (typeof code !== 'string' || code.length === 0) return undefined;
    return messages[code] ?? generic;
  };
}

// The state is single-use and lives ten minutes, so retrying from the
// provider's tab replays a dead one; the sentence sends the visitor here. One
// sentence for Better Auth's three state codes, in each flow that can meet them.
function stateExpired(sentence: string) {
  return { state_mismatch: sentence, state_not_found: sentence, state_invalid: sentence };
}

// One sentence for every failure that trying again can fix: a callback that broke partway, a pre-redirect failure that
// never reaches a `?error=` code, and the fallback for a code the map does not name.
/** The opening every notice about an unconfirmed address shares, so the fact is worded once. */
export const UNCONFIRMED_EMAIL = "Your email address isn't confirmed yet.";

/** What an unconfirmed person is told to do; the caller adds where the link leads. */
export const CHECK_INBOX = `${UNCONFIRMED_EMAIL} Check your inbox for our message, or press Confirm Your Email to send a new one.`;

export const GENERIC_SIGN_IN_ERROR = "We couldn't sign you in. Please try again.";

// Better Auth's own OAuth callback error codes (node_modules/better-auth/dist/oauth2/errors.mjs) plus providers' own. Every
// sentence is ours: the callback's `error_description` is provider-controlled text and is never echoed.
const ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Signing in was cancelled before it finished. Choose a sign-in method to try again.',
  no_code: GENERIC_SIGN_IN_ERROR,
  oauth_provider_not_found: "That sign-in method isn't available right now.",
  issuer_missing: GENERIC_SIGN_IN_ERROR,
  issuer_mismatch: GENERIC_SIGN_IN_ERROR,
  invalid_code: 'That sign-in expired. Please try again.',
  nonce_binding_missing: 'That sign-in expired. Please try again.',
  unable_to_get_user_info: "We couldn't get your details from the provider. Please try again.",
  no_callback_url: GENERIC_SIGN_IN_ERROR,
  // One sentence whatever the cause: a lapsing unverified account holding the
  // address and a provider that never vouches over an existing row share the
  // code, and a sentence naming either would confirm the address is taken.
  account_not_linked:
    "We couldn't sign you in this way. Use the sign-in method you used before, then add this one on your account page.",
  // At a sign-in, only a failed write of the account row. The link flow's
  // own codes land on /account/sign-in instead (`linkErrorMessage`).
  unable_to_link_account: GENERIC_SIGN_IN_ERROR,
  // No `email_not_found`: a provider that shares no address gets a placeholder
  // and the email page asks (src/lib/auth.ts, `orPlaceholder`).
  // Reached only if a provider ever requires verification; none does today.
  email_not_verified: `${UNCONFIRMED_EMAIL} Open the link we emailed you, or change the address on your email page.`,
  ...stateExpired('That sign-in expired, or was started in another tab. Please start again here.'),
  // A verification link opened from a signed-out browser (src/lib/auth.ts):
  // the link still works, so the sentence says to open it again.
  sign_in_to_verify:
    'That confirmation link needs you to be signed in. Sign in to the account that asked for this email address, then open the link again.',
};

export const signInErrorMessage = messageLookup(ERROR_MESSAGES, GENERIC_SIGN_IN_ERROR);

export const ACCOUNT_PATH = '/account';

export const ACCOUNT_SIGN_IN_PATH = '/account/sign-in';

export const ACCOUNT_PASSWORD_PATH = `${ACCOUNT_SIGN_IN_PATH}#password` as Route;
export const ACCOUNT_PASSKEYS_PATH = `${ACCOUNT_SIGN_IN_PATH}#passkeys` as Route;

export const ACCOUNT_INVITATIONS_ID = 'account-invitations';
export const ACCOUNT_INVITATIONS_PATH = `${ACCOUNT_PATH}#${ACCOUNT_INVITATIONS_ID}` as const;

// The codes a link from /account/sign-in lands back there with. With every provider
// vouching inside a link and different addresses allowed, the rest are a
// failed write or a misconfiguration, and share the generic sentence.
const LINK_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Adding the sign-in method was cancelled before it finished. Press Add to try again.',
  // Only the holder of that provider account can reach this, so saying so
  // reveals nothing they could not learn by signing in with it.
  account_already_linked_to_different_user:
    'That account already signs in to a different Sorrel & Salt account.',
  ...stateExpired(
    'Adding the sign-in method took too long, or was started in another tab. Press Add to start again.',
  ),
};

/** Also what SignInMethods shows when `/link-social` itself fails, before any redirect. */
export const GENERIC_LINK_ERROR = "That sign-in method couldn't be added. Please try again.";

export const linkErrorMessage = messageLookup(LINK_ERROR_MESSAGES, GENERIC_LINK_ERROR);

const UNLINK_ERROR_MESSAGES: Record<string, string> = {
  // The page offers no Remove with one method left; two tabs can still race.
  FAILED_TO_UNLINK_LAST_ACCOUNT: "Your only sign-in method can't be removed. Add another first.",
  // The endpoint wants a session younger than Better Auth's `freshAge`, a day.
  SESSION_NOT_FRESH:
    'Removing a sign-in method needs a recent sign-in. Sign out and sign back in, then remove it.',
};

export const GENERIC_UNLINK_ERROR = "That sign-in method couldn't be removed. Please try again.";

const unlinkLookup = messageLookup(UNLINK_ERROR_MESSAGES, GENERIC_UNLINK_ERROR);

/** Unlike a callback's lookup a missing code still has a sentence, since the call was refused either way. */
export function unlinkErrorMessage(code: string | undefined): string {
  return unlinkLookup(code) ?? GENERIC_UNLINK_ERROR;
}
