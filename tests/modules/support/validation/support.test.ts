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
