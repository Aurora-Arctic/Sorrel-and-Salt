import { describe, expect, it } from 'vitest';
import {
  ERROR_REFERENCE_MAX_LENGTH,
  SignedOutSupportRequestInput,
} from '@/modules/support/validation/support';

// The signed-in and signed-out schemas share one error reference limit and one message.

const request = (errorReference: string) =>
  SignedOutSupportRequestInput.safeParse({
    about: 'bug',
    email: 'testwort@example.com',
    subject: 'Testwort subject',
    message: 'Testwort message',
    errorReference,
  });

describe('SignedOutSupportRequestInput error reference', () => {
  it.each([65, 100])('accepts a reference of %i characters', (length) => {
    expect(request('a'.repeat(length)).success).toBe(true);
  });

  it('refuses 101 characters, in the signed-in wording', () => {
    const result = request('a'.repeat(ERROR_REFERENCE_MAX_LENGTH + 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('That error reference is too long');
  });
});
