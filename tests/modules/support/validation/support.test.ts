import { describe, expect, it } from 'vitest';
import {
  ERROR_REFERENCE_MAX_LENGTH,
  SignedOutSupportRequestInput,
  SupportRequestInput,
} from '@/modules/support/validation/support';

const BASE = { about: 'bug', subject: 'Broken', message: 'It broke' } as const;

describe('error reference limit', () => {
  it('is the same for a signed-in and a signed-out request', () => {
    const reference = 'x'.repeat(80);
    expect(SupportRequestInput.safeParse({ ...BASE, errorReference: reference }).success).toBe(
      true,
    );
    expect(
      SignedOutSupportRequestInput.safeParse({
        ...BASE,
        email: 'a@example.com',
        errorReference: reference,
      }).success,
    ).toBe(true);
  });

  it('refuses one past the limit in both', () => {
    const reference = 'x'.repeat(ERROR_REFERENCE_MAX_LENGTH + 1);
    expect(SupportRequestInput.safeParse({ ...BASE, errorReference: reference }).success).toBe(
      false,
    );
    expect(
      SignedOutSupportRequestInput.safeParse({
        ...BASE,
        email: 'a@example.com',
        errorReference: reference,
      }).success,
    ).toBe(false);
  });
});

describe('SignedOutSupportRequestInput error reference', () => {
  const request = (errorReference: string) =>
    SignedOutSupportRequestInput.safeParse({
      about: 'bug',
      email: 'testwort@example.com',
      subject: 'Testwort subject',
      message: 'Testwort message',
      errorReference,
    });

  it.each([65, 100])('accepts a reference of %i characters', (length) => {
    expect(request('a'.repeat(length)).success).toBe(true);
  });

  it('refuses 101 characters, in the signed-in wording', () => {
    const result = request('a'.repeat(ERROR_REFERENCE_MAX_LENGTH + 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('That error reference is too long');
  });
});
