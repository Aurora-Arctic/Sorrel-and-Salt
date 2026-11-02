import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { TERMS_VERSION } from '@/lib/terms-version';
import { NotFound } from '@/lib/errors';
import { agreeToTerms, hasAgreedToTerms } from '@/modules/identity';
import { A, B, asUser } from '../../../support/as-user';

// Agreement is recorded by the service alone: it writes the current version, never one the caller names, and stamps the row
// with the session's user (claude-docs/auth/admin-bootstrap.md, "The terms page").

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

interface TermsRow {
  terms_version: string | null;
  terms_accepted_at: Date | null;
  updated_by: string;
}

async function row(id: string): Promise<TermsRow> {
  const [found] =
    await sql`select terms_version, terms_accepted_at, updated_by from users where id = ${id}`;
  return found as TermsRow;
}

beforeEach(async () => {
  // Neither has agreed, so a version on a row shows as this call's write.
  for (const user of [A, B]) {
    await sql`update users set terms_version = null, terms_accepted_at = null where id = ${user.id}`;
  }
});

describe('agreeToTerms', () => {
  it('records the current version and when, stamped with the session user', async () => {
    expect(await row(A.id)).toMatchObject({ terms_version: null, terms_accepted_at: null });

    const me = await agreeToTerms(asUser(A));

    expect(me).toMatchObject({ id: A.id, termsVersion: TERMS_VERSION });
    expect(await row(A.id)).toMatchObject({
      terms_version: TERMS_VERSION,
      terms_accepted_at: expect.any(Date),
      updated_by: A.id,
    });
  });

  it("leaves another user's row untouched", async () => {
    const before = await row(B.id);

    await agreeToTerms(asUser(A));

    expect(before.terms_version).toBeNull();
    expect(await row(B.id)).toEqual(before);
  });

  it('takes no version from the caller', () => {
    expect(agreeToTerms.length).toBe(1);
  });

  it('moves an older version on to the current one', async () => {
    await sql`update users set terms_version = '2020-01-01', terms_accepted_at = now() - interval '1 day' where id = ${A.id}`;

    await agreeToTerms(asUser(A));

    expect((await row(A.id)).terms_version).toBe(TERMS_VERSION);
  });

  it('refuses a session whose row is gone', async () => {
    await expect(
      agreeToTerms({ userId: '00000000-0000-0000-0000-00000000ffff', role: 'user' }),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe('hasAgreedToTerms', () => {
  it('is true only for the current version', () => {
    expect(hasAgreedToTerms(TERMS_VERSION)).toBe(true);
    expect(hasAgreedToTerms('2020-01-01')).toBe(false);
    expect(hasAgreedToTerms(null)).toBe(false);
    expect(hasAgreedToTerms(undefined)).toBe(false);
  });

  it('is false for everyone when the version is raised', async () => {
    await agreeToTerms(asUser(A));
    const stored = (await row(A.id)).terms_version;

    expect(hasAgreedToTerms(stored)).toBe(true);
    // A later version: what the constant becomes when the text changes.
    expect(hasAgreedToTerms(stored, `${TERMS_VERSION}-next`)).toBe(false);
  });
});
