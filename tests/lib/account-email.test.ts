import { describe, expect, it } from 'vitest';
import {
  emailPagePath,
  GENERIC_VERIFY_ERROR,
  hasVerifiedFlag,
  isEmailPage,
  returnPathOf,
  verifiedLanding,
  verifyErrorMessage,
} from '@/lib/account-email';

// The page a followed verification link lands on shows a sentence, never the
// `?error=` code Better Auth or src/lib/auth.ts appended.

describe('verifyErrorMessage', () => {
  it('answers undefined for no code, an empty code, or a repeated one', () => {
    expect(verifyErrorMessage(undefined)).toBeUndefined();
    expect(verifyErrorMessage('')).toBeUndefined();
    expect(verifyErrorMessage(['TOKEN_EXPIRED', 'INVALID_TOKEN'])).toBeUndefined();
  });

  it('gives each known code a sentence of its own, never the code', () => {
    for (const code of [
      'SIGN_IN_TO_VERIFY',
      'EMAIL_TAKEN',
      'TOKEN_EXPIRED',
      'INVALID_TOKEN',
      'INVALID_USER',
      'USER_NOT_FOUND',
    ]) {
      const message = verifyErrorMessage(code);

      expect(message).not.toBe(GENERIC_VERIFY_ERROR);
      expect(message).not.toContain(code);
    }
  });

  it('gives an unknown code the generic sentence', () => {
    expect(verifyErrorMessage('SOMETHING_NEW')).toBe(GENERIC_VERIFY_ERROR);
  });
});

describe("the email page's paths", () => {
  it('lands a followed link with no return path on the confirmed view, as it always has', () => {
    expect(verifiedLanding(undefined)).toBe('/account/email?verified');
  });

  it('carries a same-site return path on to Continue, encoded', () => {
    expect(verifiedLanding('/admin')).toBe('/account/email?verified&next=%2Fadmin');
    expect(verifiedLanding('/coven/hearth?tab=mine')).toBe(
      '/account/email?verified&next=%2Fcoven%2Fhearth%3Ftab%3Dmine',
    );
  });

  // The open-redirect guard runs when the link is built, not only when the
  // page reads it back: a mailed link never names somewhere else. Which paths
  // leave the site is safeReturnPath's (tests/lib/sign-in.test.ts).
  it('drops a return path that leaves the site, landing as it always has', () => {
    expect(verifiedLanding('//evil.example')).toBe('/account/email?verified');
  });

  // Continue's landing without one is the role's, so an explicit /coven is
  // carried like any other: an admin who asked for it still lands on it (MB.113).
  it('carries an explicit /coven, which is not the same as none', () => {
    expect(verifiedLanding('/coven')).toBe('/account/email?verified&next=%2Fcoven');
  });

  it("reads a sign-up link's callbackURL as where the sign-in was going", () => {
    expect(returnPathOf('/admin')).toBe('/admin');
    expect(returnPathOf('/coven/hearth?tab=mine')).toBe('/coven/hearth?tab=mine');
  });

  // A resend's callbackURL is the landing the email page asked for, and a
  // sign-in may itself have been headed for the email page: either way the
  // page's own `next` is the one to carry, never the page.
  it("reads the email page's own next out of a callbackURL on it", () => {
    expect(returnPathOf('/account/email?verified&next=%2Fadmin')).toBe('/admin');
    expect(returnPathOf('/account/email?next=%2Fadmin')).toBe('/admin');
    expect(returnPathOf('/account/email?verified')).toBeUndefined();
    expect(returnPathOf('/account/email')).toBeUndefined();
  });

  it('reads nothing from a link with no callbackURL', () => {
    expect(returnPathOf(null)).toBeUndefined();
  });

  // Present is enough: a bare `?verified` reads as '', and a URL rebuilt
  // through URLSearchParams writes it back as `?verified=`.
  it('reads the flag by its presence, whatever its value', () => {
    expect(hasVerifiedFlag('')).toBe(true);
    expect(hasVerifiedFlag('1')).toBe(true);
    expect(hasVerifiedFlag(['', ''])).toBe(true);
    expect(hasVerifiedFlag(undefined)).toBe(false);
  });

  it('carries the return path encoded', () => {
    expect(emailPagePath('/coven/hearth?tab=mine')).toBe(
      '/account/email?next=%2Fcoven%2Fhearth%3Ftab%3Dmine',
    );
  });

  it('is the bare page when there is no return path', () => {
    expect(emailPagePath(undefined)).toBe('/account/email');
  });

  it('recognises the page with or without a query, and nothing that only starts like it', () => {
    expect(isEmailPage('/account/email')).toBe(true);
    expect(isEmailPage('/account/email?verified')).toBe(true);
    expect(isEmailPage('/account/emails')).toBe(false);
    expect(isEmailPage('/account/email/x')).toBe(false);
    expect(isEmailPage(undefined)).toBe(false);
  });
});
