import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import type { EmailVerificationSender } from '@/modules/identity';
import { noSender } from '../../../support/email-verification';
import { B, asUser } from '../../../support/as-user';
import { run as runOperation } from '../../../support/graphql/run';

// `setEmail` over the real schema, with a sender that records what it was
// asked to mail: the mutation's `next` is where the link lands afterwards
// (claude-docs/auth/admin-bootstrap.md, "The email page"), and its one
// `VALIDATION` read as the browser reads it. What the service refuses, and
// why, is services/email.test.ts's; a signed-out caller is
// tests/db/graphql-query-scopes.test.ts's.

const NEW = 'new@set-email.test';

const SET_EMAIL = /* GraphQL */ `
  mutation SetEmail($email: String!, $next: String) {
    setEmail(email: $email, next: $next) {
      id
    }
  }
`;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

async function run(variables: Record<string, unknown>) {
  // Out of the cooldown, so the service reaches the sender.
  await sql`update users set verification_sent_at = null where id = ${B.id}`;
  const requestChange = vi.fn<EmailVerificationSender['requestChange']>(async () => {});
  const result = await runOperation(asUser(B), SET_EMAIL, variables, {
    emailVerification: { ...noSender, requestChange },
  });
  return { result, requestChange };
}

describe('the setEmail mutation', () => {
  it('hands the sender the next it was sent', async () => {
    const { result, requestChange } = await run({ email: NEW, next: '/admin' });

    expect(result.errors).toBeUndefined();
    expect(requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, '/admin');
  });

  it('hands the sender no next when it was sent none', async () => {
    const { result, requestChange } = await run({ email: NEW });

    expect(result.errors).toBeUndefined();
    expect(requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, undefined);
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
