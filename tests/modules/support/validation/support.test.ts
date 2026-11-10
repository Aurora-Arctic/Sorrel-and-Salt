import { describe, expect, it } from 'vitest';
import {
  ERROR_REFERENCE_MAX_LENGTH,
  SignedOutSupportRequestInput,
  SupportRequestInput,
} from '@/modules/support/validation/support';

const BASE = { about: 'bug', subject: 'Broken', message: 'It broke' } as const;

const signedIn = (errorReference: string) =>
  SupportRequestInput.safeParse({ ...BASE, errorReference });
const signedOut = (errorReference: string) =>
  SignedOutSupportRequestInput.safeParse({
    ...BASE,
    email: 'testwort@example.com',
    errorReference,
  });

describe('error reference limit', () => {
  it.each([65, ERROR_REFERENCE_MAX_LENGTH])(
    'accepts a reference of %i characters, signed in or out',
    (length) => {
      expect(signedIn('a'.repeat(length)).success).toBe(true);
      expect(signedOut('a'.repeat(length)).success).toBe(true);
    },
  );

  it('refuses one past the limit in both, the signed-out wording naming the reference', () => {
    const reference = 'a'.repeat(ERROR_REFERENCE_MAX_LENGTH + 1);

    expect(signedIn(reference).success).toBe(false);
    const result = signedOut(reference);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('That error reference is too long');
  });
});
