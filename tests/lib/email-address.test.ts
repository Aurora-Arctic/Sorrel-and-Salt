import { describe, expect, it } from 'vitest';
import { emailFormat, validateEmailAddress } from '@/lib/email-address';
import { EmailAddress } from '@/lib/email-address-schema';

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

describe('emailFormat', () => {
  it('trims the address and lower-cases the domain, leaving the local part as typed', () => {
    expect(emailFormat('  Ada.Lovelace@Example.TEST ')).toBe('Ada.Lovelace@example.test');
  });

  it('leaves text with no @ as typed apart from its ends', () => {
    expect(emailFormat(' Ada ')).toBe('Ada');
  });
});

describe('EmailAddress', () => {
  it('accepts an address and returns it normalised', () => {
    expect(EmailAddress.parse(' Ada@Example.TEST ')).toBe('ada@example.test');
  });

  it.each(['', 'ada', 'ada@example'])('refuses %j with the format message', (value) => {
    const result = EmailAddress.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBeTruthy();
  });

  it('keeps the message that says an address cannot receive mail', () => {
    const result = EmailAddress.safeParse('ada@example.invalid');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/can't receive mail/);
  });
});
