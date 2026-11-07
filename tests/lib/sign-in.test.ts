import { describe, expect, it } from 'vitest';
import {
  GENERIC_LINK_ERROR,
  GENERIC_SIGN_IN_ERROR,
  GENERIC_UNLINK_ERROR,
  linkErrorMessage,
  NO_RETURN_PATH,
  postSignInLanding,
  safeReturnPath,
  signInErrorMessage,
  signInPath,
  SIGN_IN_TO_VERIFY_PATH,
  socialSignInTarget,
  unlinkErrorMessage,
} from '@/lib/sign-in';

// Where a sign-in with no return path lands, decided by the role the account holds once the
// callback has run. Not `/`: `/` is the public front door, and someone who just signed in has
// been through it already (claude-docs/design-decisions/auth.md, "Where the post-sign-in landing lives").
describe('postSignInLanding', () => {
  it('sends a keeper to the keepers area', () => {
    expect(postSignInLanding('admin')).toBe('/keepers');
  });

  it('sends a curator to the curator area', () => {
    expect(postSignInLanding('curator')).toBe('/curator');
  });

  it('sends everyone else to the /coven landing', () => {
    expect(postSignInLanding('user')).toBe('/coven');
  });
});

describe('socialSignInTarget', () => {
  it('heads for the return path, with an error callback carrying it, and no flag', () => {
    expect(socialSignInTarget('/coven/hearth')).toEqual({
      callbackURL: '/coven/hearth',
      errorCallbackURL: '/sign-in?next=%2Fcoven%2Fhearth',
    });
  });

  it('treats an explicit /coven as a return path like any other', () => {
    expect(socialSignInTarget('/coven')).toEqual({
      callbackURL: '/coven',
      errorCallbackURL: '/sign-in?next=%2Fcoven',
    });
  });

  it('flags a sign-in with no return path, and keeps it one on the error callback', () => {
    expect(socialSignInTarget(undefined)).toEqual({
      callbackURL: '/coven',
      errorCallbackURL: '/sign-in',
      additionalData: NO_RETURN_PATH,
    });
  });
});

// One half of the return path's round trip: /sign-in reads `next` back through safeReturnPath, so what goes in must come out.
describe('signInPath', () => {
  const roundTrip = (returnPath: string) => {
    const next = new URL(signInPath(returnPath), 'http://localhost').searchParams.get('next');
    return safeReturnPath(next ?? undefined);
  };

  it('is the bare sign-in page when there is no return path', () => {
    expect(signInPath(undefined)).toBe('/sign-in');
  });

  it.each(['/', '/coven/hearth/grimoire/new?from=a%26b&q=rose%20petal'])(
    'survives the round trip through /sign-in: %s',
    (returnPath) => {
      expect(roundTrip(returnPath)).toBe(returnPath);
    },
  );
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

  // No landing stands in for a refused path: which landing is the role's, and the callback decides it.
  it('is no return path for undefined or an empty string', () => {
    expect(safeReturnPath(undefined)).toBeUndefined();
    expect(safeReturnPath('')).toBeUndefined();
  });

  it('is no return path for a protocol-relative URL', () => {
    expect(safeReturnPath('//evil.example')).toBeUndefined();
  });

  it('is no return path for an absolute URL', () => {
    expect(safeReturnPath('https://evil.example')).toBeUndefined();
  });

  it('is no return path for a backslash-prefixed path some browsers treat as a host', () => {
    expect(safeReturnPath('/\\evil.example')).toBeUndefined();
  });

  it('is no return path for a path with no leading slash', () => {
    expect(safeReturnPath('coven/hearth')).toBeUndefined();
  });

  it('is no return path for an array-valued query param', () => {
    expect(safeReturnPath(['/coven/hearth', '/coven/other'])).toBeUndefined();
  });
});

describe('signInErrorMessage', () => {
  it('returns undefined for no code', () => {
    expect(signInErrorMessage(undefined)).toBeUndefined();
  });

  it('gives each known callback code a sentence of its own', () => {
    const codes = ['access_denied', 'sign_in_to_verify', 'email_not_verified'];
    const messages = codes.map((code) => signInErrorMessage(code));

    expect(messages).not.toContain(GENERIC_SIGN_IN_ERROR);
    expect(new Set(messages).size).toBe(codes.length);
  });

  it('sends sign_in_to_verify back to the email page with its code', () => {
    const target = new URL(SIGN_IN_TO_VERIFY_PATH, 'http://localhost');

    expect(target.pathname).toBe('/sign-in');
    expect(target.searchParams.get('next')).toBe('/account/email');
    expect(target.searchParams.get('error')).toBe('sign_in_to_verify');
  });

  // Better Auth's state failures (oauth2/state.mjs folds state_security_mismatch into
  // state_mismatch). Retrying from the provider's tab replays the dead state, so the sentence
  // sends the visitor back here instead: one sentence for the three codes, built once.
  it('gives a state failure a sentence of its own', () => {
    expect(signInErrorMessage('state_mismatch')).not.toBe(GENERIC_SIGN_IN_ERROR);
  });

  // One sentence whatever the cause (a squatted address, or a provider that never vouches over
  // an existing row, share the code), so it confirms nothing about whether an account holds the address.
  it('gives account_not_linked a sentence that names no address and no squat', () => {
    const message = signInErrorMessage('account_not_linked');

    expect(message).not.toBe(GENERIC_SIGN_IN_ERROR);
    expect(message).not.toMatch(/unverified|already|taken|holds/i);
  });

  // At a sign-in the code means only that writing the account row failed;
  // "already linked" was a link-flow reading, and a link never lands here.
  it('gives unable_to_link_account the plain retry sentence a missing code gets', () => {
    expect(signInErrorMessage('unable_to_link_account')).toBe(signInErrorMessage('no_code'));
  });

  it('falls back to a generic sentence for an unrecognised code', () => {
    expect(signInErrorMessage('something_unexpected')).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it('never echoes the code itself, or any provider-supplied text, verbatim', () => {
    const code = 'unable_to_get_user_info';
    expect(signInErrorMessage(code)).not.toContain(code);
  });
});

// The account page's callback codes (claude-docs/auth/admin-bootstrap.md, "Linking a second
// provider"): a link lands on /account with `?error=`, never on /sign-in.
describe('linkErrorMessage', () => {
  it('is undefined with no code, or a repeated one', () => {
    expect(linkErrorMessage(undefined)).toBeUndefined();
    expect(linkErrorMessage('')).toBeUndefined();
    expect(linkErrorMessage(['access_denied', 'access_denied'])).toBeUndefined();
  });

  it('gives each known link code a sentence of its own', () => {
    const codes = ['access_denied', 'account_already_linked_to_different_user', 'state_mismatch'];
    const messages = codes.map((code) => linkErrorMessage(code));

    expect(messages).not.toContain(GENERIC_LINK_ERROR);
    expect(new Set(messages).size).toBe(codes.length);
  });

  it('falls back to its own generic sentence, not the sign-in one', () => {
    expect(linkErrorMessage('unable_to_link_account')).toBe(GENERIC_LINK_ERROR);
    expect(linkErrorMessage('something_unexpected')).toBe(GENERIC_LINK_ERROR);
    expect(GENERIC_LINK_ERROR).not.toBe(GENERIC_SIGN_IN_ERROR);
  });
});

describe('unlinkErrorMessage', () => {
  it('gives each known refusal a sentence of its own', () => {
    const last = unlinkErrorMessage('FAILED_TO_UNLINK_LAST_ACCOUNT');
    const stale = unlinkErrorMessage('SESSION_NOT_FRESH');

    expect([last, stale]).not.toContain(GENERIC_UNLINK_ERROR);
    expect(last).not.toBe(stale);
  });

  it('falls back to a generic sentence for anything else, or no code', () => {
    expect(unlinkErrorMessage('ACCOUNT_NOT_FOUND')).toBe(GENERIC_UNLINK_ERROR);
    expect(unlinkErrorMessage(undefined)).toBe(GENERIC_UNLINK_ERROR);
  });
});
