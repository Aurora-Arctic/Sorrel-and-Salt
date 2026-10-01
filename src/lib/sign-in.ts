import type { UserRole } from './session';

// Pure helpers for /sign-in?next=&error=, shared by the sign-in page and route
// protection (src/proxy.ts, src/lib/request-session.ts) — one rule for which
// return paths are safe, applied on the way out and on the way back — and the
// sentences for the account page's own OAuth round trip, the link.

/**
 * Where a sign-in goes when no page asked for the visitor back, for anyone
 * but an admin: the post-sign-in landing (M2.8), not `/` — `/` is the public
 * front door, and a visitor who has just signed in has been through it already
 * (claude-docs/design-decisions/mb.57-post-sign-in-landing.md).
 */
export const POST_SIGN_IN_LANDING = '/coven';

/** An admin's landing instead: curating starts in the admin area (MB.113). */
export const ADMIN_LANDING = '/admin';

/** Where a sign-in with no return path lands, by the role the account holds once it has signed in. */
export function postSignInLanding(role: UserRole): string {
  return role === 'admin' ? ADMIN_LANDING : POST_SIGN_IN_LANDING;
}

/**
 * The open-redirect guard for `?next=`. A same-site absolute path is kept
 * verbatim; anything else — an absolute URL, a protocol-relative `//host`, a
 * `/\host` some browsers still resolve as one, a relative path, a missing
 * value, or Next's array-valued searchParams for a repeated key — is no
 * return path at all, and the landing is then the role's (`postSignInLanding`).
 * Without this, `?next=https://evil.example` would make /sign-in redirect
 * anywhere after a real sign-in.
 */
export function safeReturnPath(raw: string | string[] | undefined): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  // A single leading slash, not a second slash or backslash right after it —
  // both are how a URL parser can be tricked into reading the rest as a host.
  if (!/^\/(?!\/|\\)/.test(raw)) return undefined;
  // A newline anywhere would let this value smuggle a second header into
  // whatever eventually turns it into a redirect response.
  if (/[\r\n]/.test(raw)) return undefined;
  return raw;
}

/**
 * What a sign-in with no return path tells the callback, in Better Auth's
 * `additionalData`, so that it lands the account by role. A flag rather than
 * a landing path for the callback to recognise: `/coven` asked for by name
 * must still win for an admin.
 */
export const NO_RETURN_PATH = { noReturnPath: true } as const;

/**
 * `signIn.social`'s destinations for a sign-in headed for `next`, or for none.
 * With none, `callbackURL` is only what Better Auth requires, since the
 * callback replaces it, and a failed attempt keeps asking for none.
 */
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
 * The request header the proxy forwards a protected page's own path and query
 * in. A server component cannot read its URL, and `requireSession()` needs it
 * for a redirect the proxy's cookie check did not catch. The proxy overwrites
 * any client-supplied value; `safeReturnPath` still guards the read.
 */
export const RETURN_PATH_HEADER = 'x-sorrel-return-path';

/** Where a verification link opened from no session goes: sign in, then back to the email page. */
export const SIGN_IN_TO_VERIFY_PATH = '/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify';

/**
 * The readable cookie Better Auth's `lastLoginMethod` writes on each callback
 * that sets a session, naming the provider. Passed to the server plugin and
 * the client one alike, which must agree on it.
 */
export const LAST_USED_PROVIDER_COOKIE = 'better-auth.last_used_login_method';

/** `/sign-in`, carrying `returnPath` as `?next=` once it has passed `safeReturnPath`. */
export function signInPath(returnPath: string | undefined): '/sign-in' | `/sign-in?next=${string}` {
  const path = safeReturnPath(returnPath);
  if (path === undefined) return '/sign-in';
  return `/sign-in?next=${encodeURIComponent(path)}`;
}

// Better Auth's own OAuth callback error codes (node_modules/better-auth/dist/
// oauth2/errors.mjs) plus the ones providers themselves return. Every
// sentence here is ours — "a readable error, not a stack trace" means never
// echoing the callback's own error_description, which is provider-controlled
// text we have not reviewed.
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Sign-in was cancelled before it finished.',
  no_code: "Sign-in didn't complete. Please try again.",
  oauth_provider_not_found: "That sign-in option isn't available right now.",
  issuer_missing: "Sign-in didn't complete. Please try again.",
  issuer_mismatch: "Sign-in didn't complete. Please try again.",
  invalid_code: 'That sign-in link has expired. Please try again.',
  nonce_binding_missing: 'That sign-in link has expired. Please try again.',
  unable_to_get_user_info: "We couldn't retrieve your account details. Please try again.",
  no_callback_url: "Sign-in didn't complete. Please try again.",
  // One sentence whatever the cause: a lapsing unverified account holding the
  // address and a provider that never vouches over an existing row share the
  // code, and a sentence naming either would confirm the address is taken.
  account_not_linked:
    "Sign-in didn't work. If you signed in before with a different provider, sign in that way, then add this one under Account.",
  // At a sign-in, only a failed write of the account row. The link flow's
  // own codes land on /account instead (`linkErrorMessage`).
  unable_to_link_account: "Sign-in didn't complete. Please try again.",
  // No `email_not_found`: a provider that shares no address gets a placeholder
  // and the email page asks (src/lib/auth.ts, `orPlaceholder`).
  // Reached only if a provider ever requires verification; none does today.
  email_not_verified:
    'Please confirm your email address first: open the link we sent you, or change the address on your email page.',
  // The state is single-use and lives ten minutes, so retrying from the
  // provider's tab replays a dead one; the sentence sends the visitor here.
  state_mismatch: 'That sign-in expired or was started in another tab. Please start again here.',
  state_not_found: 'That sign-in expired or was started in another tab. Please start again here.',
  state_invalid: 'That sign-in expired or was started in another tab. Please start again here.',
  // A verification link opened from a signed-out browser (src/lib/auth.ts):
  // the link still works, so the sentence says to open it again.
  sign_in_to_verify:
    'Sign in to the account that asked for this email address, then open the link in the email again.',
};

// Also what SignInPanel shows for a pre-redirect failure (a bad request, a
// network error) that never reaches a `?error=` code at all — one sentence,
// not two ways of saying the same thing.
export const GENERIC_SIGN_IN_ERROR = "Sign-in didn't work. Please try again.";

/** One readable sentence for a callback `?error=` code; `undefined` for none. */
export function signInErrorMessage(code: string | string[] | undefined): string | undefined {
  if (typeof code !== 'string' || code.length === 0) return undefined;
  return ERROR_MESSAGES[code] ?? GENERIC_SIGN_IN_ERROR;
}

/** The account page, where a link starts and lands again, with `?error=` when it failed. */
export const ACCOUNT_PATH = '/account';

const STATE_EXPIRED = 'That expired or was started in another tab. Please start again here.';

// The codes a link from /account lands back there with. With every provider
// vouching inside a link and different addresses allowed, the rest are a
// failed write or a misconfiguration, and share the generic sentence.
const LINK_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Adding the sign-in method was cancelled before it finished.',
  // Only the holder of that provider account can reach this, so saying so
  // reveals nothing they could not learn by signing in with it.
  account_already_linked_to_different_user:
    'That account already signs in to a different Sorrel & Salt account.',
  state_mismatch: STATE_EXPIRED,
  state_not_found: STATE_EXPIRED,
  state_invalid: STATE_EXPIRED,
};

/** Also what SignInMethods shows when `/link-social` itself fails, before any redirect. */
export const GENERIC_LINK_ERROR = "That sign-in method couldn't be added. Please try again.";

/** One readable sentence for a link callback's `?error=` code on /account; `undefined` for none. */
export function linkErrorMessage(code: string | string[] | undefined): string | undefined {
  if (typeof code !== 'string' || code.length === 0) return undefined;
  return LINK_ERROR_MESSAGES[code] ?? GENERIC_LINK_ERROR;
}

// Better Auth's /unlink-account refusals, by the `code` in its JSON body.
const UNLINK_ERROR_MESSAGES: Record<string, string> = {
  // The page offers no Remove with one method left; two tabs can still race.
  FAILED_TO_UNLINK_LAST_ACCOUNT: "Your only sign-in method can't be removed.",
  // The endpoint wants a session younger than Better Auth's `freshAge`, a day.
  SESSION_NOT_FRESH:
    'Removing a sign-in method needs a recent sign-in. Sign in again, then remove it.',
};

export const GENERIC_UNLINK_ERROR = "That sign-in method couldn't be removed. Please try again.";

/** One readable sentence for a refused `/unlink-account`. */
export function unlinkErrorMessage(code: string | undefined): string {
  return (code && UNLINK_ERROR_MESSAGES[code]) || GENERIC_UNLINK_ERROR;
}
