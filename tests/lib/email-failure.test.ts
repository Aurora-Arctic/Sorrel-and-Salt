import { describe, expect, it } from 'vitest';
import { emailFailure } from '@/lib/email-failure';

describe('emailFailure', () => {
  it('says nothing for an address that passes, however it is cased or padded', () => {
    expect(emailFailure('  Name@Example.com ')).toBeUndefined();
  });

  it('places the refusal of a bad address beside the email field', () => {
    const refused = emailFailure('not an address');
    expect(refused?.field?.name).toBe('email');
    expect(refused?.field?.message).toBeTruthy();
  });

  it('refuses an empty address', () => {
    expect(emailFailure('')?.field?.name).toBe('email');
  });
});
