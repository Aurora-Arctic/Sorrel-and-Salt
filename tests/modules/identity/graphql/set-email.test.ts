import { graphql } from 'graphql';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { EmailVerificationSender } from '@/modules/identity';
import { noSender } from '../../../support/email-verification';
import { B, asUser } from '../../../support/as-user';

// `setEmail` over the real schema, with a sender that records what it was
// asked to mail: the mutation's `next` is where the link lands afterwards
// (claude-docs/auth/admin-bootstrap.md, "The email page").

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
  const result = await graphql({
    schema,
    source: SET_EMAIL,
    variableValues: variables,
    contextValue: {
      session: asUser(B),
      loaders: createLoaders(asUser(B)),
      emailVerification: { ...noSender, requestChange },
    },
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
});
