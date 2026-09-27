import { describe, expect, it } from 'vitest';
import {
  emailPagePath,
  GENERIC_VERIFY_ERROR,
  isEmailPage,
  VERIFIED_LANDING,
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

  it.each([
    'SIGN_IN_TO_VERIFY',
    'EMAIL_TAKEN',
    'TOKEN_EXPIRED',
    'INVALID_TOKEN',
    'INVALID_USER',
    'USER_NOT_FOUND',
  ])('gives %s a sentence of its own, never the code', (code) => {
    const message = verifyErrorMessage(code);

    expect(message).toMatch(/[a-z]/);
    expect(message).not.toContain(code);
  });

  it('tells a signed-out click to sign in to the same account', () => {
    expect(verifyErrorMessage('SIGN_IN_TO_VERIFY')).toMatch(/signed in to this account/i);
  });

  it('gives an unknown code the generic sentence', () => {
    expect(verifyErrorMessage('SOMETHING_NEW')).toBe(GENERIC_VERIFY_ERROR);
  });
});

describe("the email page's paths", () => {
  it('lands a followed link on the confirmed view', () => {
    expect(VERIFIED_LANDING).toBe('/account/email?verified=1');
  });

  it('carries the return path encoded', () => {
    expect(emailPagePath('/coven/hearth?tab=mine')).toBe(
      '/account/email?next=%2Fcoven%2Fhearth%3Ftab%3Dmine',
    );
  });

  it('recognises the page with or without a query, and nothing that only starts like it', () => {
    expect(isEmailPage('/account/email')).toBe(true);
    expect(isEmailPage('/account/email?verified=1')).toBe(true);
    expect(isEmailPage('/account/emails')).toBe(false);
    expect(isEmailPage('/account/email/x')).toBe(false);
    expect(isEmailPage(undefined)).toBe(false);
  });
});
