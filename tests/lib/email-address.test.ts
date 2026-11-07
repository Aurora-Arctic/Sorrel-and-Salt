import { describe, expect, it } from 'vitest';
import { validateEmailAddress } from '@/lib/email-address';

// The empty, over-long and reserved-domain refusals are tests/modules/identity/services/email.test.ts's.
describe('validateEmailAddress', () => {
  it.each([
    ['no @', 'ada.example.test'],
    ['no dot in the domain', 'ada@example'],
    ['a space in it', 'ada lovelace@example.test'],
  ])('refuses an address with %s on the email field', (_why, address) => {
    expect(validateEmailAddress(address)).toEqual({ path: ['email'], message: expect.any(String) });
  });
});
