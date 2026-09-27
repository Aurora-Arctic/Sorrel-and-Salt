import { describe, expect, it } from 'vitest';
import {
  GENERIC_SIGN_IN_ERROR,
  POST_SIGN_IN_LANDING,
  safeReturnPath,
  signInErrorMessage,
  signInPath,
  SIGN_IN_TO_VERIFY_PATH,
} from '@/lib/sign-in';

// The fallback is the post-sign-in landing, not `/`: `/` is the public front
// door, and someone who just signed in has been through it already
// (claude-docs/design-decisions/mb.57-post-sign-in-landing.md).
describe('POST_SIGN_IN_LANDING', () => {
  it('is the /coven landing', () => {
    expect(POST_SIGN_IN_LANDING).toBe('/coven');
  });

  it('is what signInPath sends a visitor to when there is no return path', () => {
    expect(signInPath(undefined)).toBe('/sign-in?next=%2Fcoven');
  });
});

// safeReturnPath is the open-redirect guard for ?next=: without it, a crafted
// link could make /sign-in redirect anywhere after a real sign-in.
describe('safeReturnPath', () => {
  it('keeps a same-site absolute path', () => {
    expect(safeReturnPath('/coven/hearth')).toBe('/coven/hearth');
  });

  it('keeps a same-site path carrying a query string', () => {
    expect(safeReturnPath('/coven/hearth?tab=stock')).toBe('/coven/hearth?tab=stock');
  });

  it('falls back to the landing for undefined', () => {
    expect(safeReturnPath(undefined)).toBe('/coven');
  });

  it('falls back to the landing for an empty string', () => {
    expect(safeReturnPath('')).toBe('/coven');
  });

  it('falls back to the landing for a protocol-relative URL', () => {
    expect(safeReturnPath('//evil.example')).toBe('/coven');
  });

  it('falls back to the landing for an absolute URL', () => {
    expect(safeReturnPath('https://evil.example')).toBe('/coven');
  });

  it('falls back to the landing for a backslash-prefixed path some browsers treat as a host', () => {
    expect(safeReturnPath('/\\evil.example')).toBe('/coven');
  });

  it('falls back to the landing for a path with no leading slash', () => {
    expect(safeReturnPath('coven/hearth')).toBe('/coven');
  });

  it('falls back to the landing for an array-valued query param', () => {
    expect(safeReturnPath(['/coven/hearth', '/coven/other'])).toBe('/coven');
  });
});

// The callback error page must show one of our sentences, never Better
// Auth's or the provider's own error_description text.
describe('signInErrorMessage', () => {
  it('returns undefined for no code', () => {
    expect(signInErrorMessage(undefined)).toBeUndefined();
  });

  it('maps a known Better Auth callback code to a readable sentence', () => {
    expect(signInErrorMessage('access_denied')).toMatch(/[a-z]/i);
  });

  // A provider that shares no address gets a placeholder and the email page
  // asks (MB.54), so the code no longer occurs; a regression gets the generic sentence.
  it('no longer gives email_not_found a sentence of its own', () => {
    expect(signInErrorMessage('email_not_found')).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it('tells sign_in_to_verify to sign in and open the link again, and SIGN_IN_TO_VERIFY_PATH carries the code and the email page', () => {
    expect(signInErrorMessage('sign_in_to_verify')).toMatch(/sign in.*open the link.*again/i);
    expect(SIGN_IN_TO_VERIFY_PATH).toBe('/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify');
  });

  it('points email_not_verified at the mailed link and the email page, not the provider', () => {
    const message = signInErrorMessage('email_not_verified');

    expect(message).toMatch(/link we (sent|emailed)/i);
    expect(message).toMatch(/email page/i);
    expect(message).not.toMatch(/with the provider/i);
  });

  // Better Auth's state failures (oauth2/state.mjs folds state_security_mismatch
  // into state_mismatch). Retrying from the provider's tab replays the dead
  // state, so the sentence must send the visitor back here instead.
  it.each(['state_mismatch', 'state_not_found', 'state_invalid'])(
    'gives %s a sentence that says to start again from this page',
    (code) => {
      const message = signInErrorMessage(code);
      expect(message).not.toBe(GENERIC_SIGN_IN_ERROR);
      expect(message).toMatch(/start again/i);
    },
  );

  // One sentence whatever the cause — a squatted address or a provider that
  // never vouches over an existing row share the code — so it confirms
  // nothing about whether an account holds the address (MB.71's plan).
  it('gives account_not_linked a sentence that names no address and no squat', () => {
    const message = signInErrorMessage('account_not_linked');

    expect(message).not.toBe(GENERIC_SIGN_IN_ERROR);
    expect(message).toMatch(/sign in that way, then add this one under Account/);
    expect(message).not.toMatch(/unverified|already|taken|holds/i);
  });

  it('falls back to a generic sentence for an unrecognised code', () => {
    const message = signInErrorMessage('something_unexpected');
    expect(message).toMatch(/[a-z]/i);
  });

  it('never echoes the code itself, or any provider-supplied text, verbatim', () => {
    const code = 'unable_to_get_user_info';
    expect(signInErrorMessage(code)).not.toContain(code);
  });
});

// Where route protection sends a signed-out visitor, and one half of the return
// path's round trip: /sign-in reads `next` back through safeReturnPath, so what
// goes in must be what comes out.
describe('signInPath', () => {
  const roundTrip = (returnPath: string) => {
    const next = new URL(signInPath(returnPath), 'http://localhost').searchParams.get('next');
    return safeReturnPath(next ?? undefined);
  };

  it('points at /sign-in carrying the return path', () => {
    expect(signInPath('/coven/hearth')).toBe('/sign-in?next=%2Fcoven%2Fhearth');
  });

  it.each([
    '/',
    '/coven/hearth/grimoire',
    '/coven/hearth/ingredients?tab=stock&q=salt',
    '/compendium?q=rose%20petal',
    '/coven/hearth/grimoire/new?from=a%26b',
  ])('survives the round trip through /sign-in: %s', (returnPath) => {
    expect(roundTrip(returnPath)).toBe(returnPath);
  });

  // The proxy builds the return path from the request URL, and `//evil.example`
  // is a pathname a request can really carry.
  it.each(['//evil.example', 'https://evil.example', '/\\evil.example'])(
    'falls back to the landing for an unsafe return path: %s',
    (unsafe) => {
      expect(signInPath(unsafe)).toBe('/sign-in?next=%2Fcoven');
    },
  );
});
