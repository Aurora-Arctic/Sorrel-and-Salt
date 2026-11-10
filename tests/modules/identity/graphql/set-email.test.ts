import { describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import type { EmailVerificationSender } from '@/modules/identity';
import { noSender } from '../../../support/email-verification';
import { B, asUser } from '../../../support/as-user';
import { run as runOperation } from '../../../support/graphql/run';
import { useTestDatabase } from '../../../support/db/database';

const NEW = 'new@set-email.test';

const SET_EMAIL = /* GraphQL */ `
  mutation SetEmail($email: String!, $next: String) {
    setEmail(email: $email, next: $next) {
      id
    }
  }
`;

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

async function run(variables: Record<string, unknown>) {
  // Out of the cooldown, so the service reaches the sender.
  await sql`update users set verification_sent_at = null where id = ${B.id}`;
  const requestChange = vi.fn<EmailVerificationSender['requestChange']>(async () => {});
  const result = await runOperation(asUser(B), SET_EMAIL, variables, {
    emailVerification: {
      ...noSender,
      requestChange,
      sessionIsFresh: async () => true,
      notifyChangeRequested: async () => {},
      defer: (task) => void task(),
    },
  });
  return { result, requestChange };
}

describe('the setEmail mutation', () => {
  it('hands the sender the next it was sent', async () => {
    const { result, requestChange } = await run({ email: NEW, next: '/keepers' });

    expect(result.errors).toBeUndefined();
    expect(requestChange).toHaveBeenCalledExactlyOnceWith(B.id, '/keepers');
  });

  it('hands the sender no next when it was sent none', async () => {
    const { result, requestChange } = await run({ email: NEW });

    expect(result.errors).toBeUndefined();
    expect(requestChange).toHaveBeenCalledExactlyOnceWith(B.id, undefined);
  });

  // Why it could have been sent: the two above, the same session and sender,
  // reach the sender with a well-formed address.
  it('answers a malformed address as VALIDATION on `email`, sending nothing', async () => {
    const { result, requestChange } = await run({ email: 'not an address' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      path: ['setEmail'],
      extensions: { code: 'VALIDATION', fieldErrors: [{ path: ['email'] }] },
    });
    expect(requestChange).not.toHaveBeenCalled();
  });
});
