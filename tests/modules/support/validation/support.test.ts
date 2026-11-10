import { describe, expect, it } from 'vitest';
import { limitMessage } from '@/lib/formats';
import {
  ERROR_DETAIL_MAX_LENGTH,
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

const withDetail = (errorDetail: string) => ({
  in: SupportRequestInput.safeParse({ ...BASE, errorDetail }),
  out: SignedOutSupportRequestInput.safeParse({
    ...BASE,
    email: 'testwort@example.com',
    errorDetail,
  }),
});

describe('error detail limit', () => {
  it('keeps a detail at the limit, signed in or out', () => {
    const { in: signedInResult, out } = withDetail('a'.repeat(ERROR_DETAIL_MAX_LENGTH));
    expect(signedInResult.data?.errorDetail).toHaveLength(ERROR_DETAIL_MAX_LENGTH);
    expect(out.data?.errorDetail).toHaveLength(ERROR_DETAIL_MAX_LENGTH);
  });

  it('refuses one past the limit in both, with the shared limit message', () => {
    const { in: signedInResult, out } = withDetail('a'.repeat(ERROR_DETAIL_MAX_LENGTH + 1));
    expect(signedInResult.success).toBe(false);
    expect(out.success).toBe(false);
    expect(out.error?.issues[0]?.message).toBe(limitMessage(ERROR_DETAIL_MAX_LENGTH));
  });
});
