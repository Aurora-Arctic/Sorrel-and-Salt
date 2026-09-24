// Two pure helpers for /sign-in?next=&error=. Both are reused by M2.7's
// route protection, which is the other place a "where do I send them back
// to" and a "what do I tell them" decision gets made.

/**
 * The open-redirect guard for `?next=`. A same-site absolute path is kept
 * verbatim; anything else — an absolute URL, a protocol-relative `//host`, a
 * `/\host` some browsers still resolve as one, a relative path, a missing
 * value, or Next's array-valued searchParams for a repeated key — falls back
 * to `/`. Without this, `?next=https://evil.example` would make /sign-in
 * redirect anywhere after a real sign-in.
 */
export function safeReturnPath(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || raw.length === 0) return '/';
  // A single leading slash, not a second slash or backslash right after it —
  // both are how a URL parser can be tricked into reading the rest as a host.
  if (!/^\/(?!\/|\\)/.test(raw)) return '/';
  // A newline anywhere would let this value smuggle a second header into
  // whatever eventually turns it into a redirect response.
  if (/[\r\n]/.test(raw)) return '/';
  return raw;
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
  unable_to_link_account: 'That account is already linked to a different sign-in method.',
  email_does_not_match: "The email address didn't match your existing account.",
  account_already_linked_to_different_user: 'That account is already linked to a different user.',
  // Discord and Facebook can both return a profile with no usable email;
  // MB.54 replaces this dead end with a way to supply one.
  email_not_found: "That provider didn't share an email address.",
  email_not_verified: 'Please verify your email address with the provider and try again.',
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
