import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { TERMS_VERSION } from '@/lib/terms-version';
import { A, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';

// `agreeToTerms` over the real schema: the caller's own row back, with the version in force. The mutation takes no
// version, so a caller cannot record another. What the service writes is services/terms.test.ts's.

const AGREE = /* GraphQL */ `
  mutation AgreeToTerms {
    agreeToTerms {
      id
      termsVersion
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

beforeEach(async () => {
  await sql`update users set terms_version = null, terms_accepted_at = null where id = ${A.id}`;
});

describe('the agreeToTerms mutation', () => {
  it('answers the caller with the version in force', async () => {
    const [before] = await sql`select terms_version from users where id = ${A.id}`;
    expect(before?.terms_version).toBeNull();

    const result = await run(asUser(A), AGREE);

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ agreeToTerms: { id: A.id, termsVersion: TERMS_VERSION } });
    const [after] =
      await sql`select terms_version, terms_accepted_at from users where id = ${A.id}`;
    expect(after?.terms_version).toBe(TERMS_VERSION);
    expect(after?.terms_accepted_at).toBeInstanceOf(Date);
  });
});
