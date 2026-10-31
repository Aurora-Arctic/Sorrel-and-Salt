import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { ValidationError } from '@/lib/errors';
import type { PasswordSetter } from '@/modules/identity';
import { B, asUser } from '../../../support/as-user';
import { run as runOperation } from '../../../support/graphql/run';

// `setPassword` over the real schema, with a setter that records what it was handed. What Better Auth refuses,
// and the mail, are tests/db/password-reset.test.ts's; a signed-out caller is tests/db/graphql-query-scopes.test.ts's.

const NEW = 'a fresh fixture passphrase';

const SET_PASSWORD = /* GraphQL */ `
  mutation SetPassword($newPassword: String!) {
    setPassword(newPassword: $newPassword)
  }
`;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterEach(async () => {
  await sql`update users set email_verified = true where id = ${B.id}`;
});

afterAll(async () => {
  await sql.end();
});

async function run(set: PasswordSetter['set'], fresh = true) {
  const setter = vi.fn(set);
  const result = await runOperation(
    asUser(B),
    SET_PASSWORD,
    { newPassword: NEW },
    { passwords: { set: setter, sessionIsFresh: async () => fresh } },
  );
  return { result, setter };
}

describe('the setPassword mutation', () => {
  it('hands the setter the new password and answers true', async () => {
    const { result, setter } = await run(async () => {});

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ setPassword: true });
    expect(setter).toHaveBeenCalledExactlyOnceWith(NEW);
  });

  it("answers the setter's refusal as VALIDATION on `newPassword`", async () => {
    const { result } = await run(async () => {
      throw new ValidationError([
        { path: ['newPassword'], message: 'Use at least 15 characters.' },
      ]);
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      path: ['setPassword'],
      extensions: { code: 'VALIDATION', fieldErrors: [{ path: ['newPassword'] }] },
    });
  });

  // Why it could have been set: the first test, the same session and setter, reaches the setter once verified.
  it('refuses an account whose address is not yet verified, setting nothing', async () => {
    await sql`update users set email_verified = false where id = ${B.id}`;

    const { result, setter } = await run(async () => {});

    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(setter).not.toHaveBeenCalled();
  });

  // Why it could have been set: the first test, the same account and setter, reaches the setter from a fresh session.
  it('refuses a session that is not fresh, saying to sign in again, and sets nothing', async () => {
    const { result, setter } = await run(async () => {}, false);

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(result.errors?.[0].message).toMatch(/sign in again/i);
    expect(setter).not.toHaveBeenCalled();
  });
});
