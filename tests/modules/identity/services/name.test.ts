import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { NAME_MAX_LENGTH } from '@/modules/identity/validation/name';
import { setName } from '@/modules/identity';
import { A, B, E, asUser } from '../../../support/as-user';
import type { NamedUserRow } from './types';

// MB.88: the name the site shows, changed by its owner alone through the
// audited write path. `setName` takes no id, so the only row a caller can
// name is the session's own (claude-docs/auth/admin-bootstrap.md, "The
// account page").

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

async function userRow(id: string): Promise<NamedUserRow> {
  const [row] = await sql`select id, name, updated_by, updated_at from users where id = ${id}`;
  return row as NamedUserRow;
}

/** The seed leaves every fixture unverified; a test says which state it is about. */
async function setVerified(id: string, verified: boolean): Promise<void> {
  await sql`update users set email_verified = ${verified} where id = ${id}`;
}

beforeEach(async () => {
  // Both verified, back to their seeded names, and stamped by E, so a stamp
  // of their own id is visible as this call's write.
  for (const user of [A, B]) {
    await sql`update users set email_verified = true, name = ${user.name}, updated_by = ${E.id} where id = ${user.id}`;
  }
});

/** The issues a refused write carried. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('setName', () => {
  it("renames the session's own row, trimmed, stamped with the session's user", async () => {
    const renamed = await setName(asUser(A), '  Fixture Renamed  ');

    expect(renamed).toMatchObject({ id: A.id, name: 'Fixture Renamed' });
    expect(await userRow(A.id)).toMatchObject({ name: 'Fixture Renamed', updated_by: A.id });
  });

  it("leaves another user's row untouched", async () => {
    // B is there to be touched: present, live, and named as seeded.
    expect(await userRow(B.id)).toMatchObject({ id: B.id, name: B.name, updated_by: E.id });

    await setName(asUser(A), 'Fixture Renamed');

    expect(await userRow(B.id)).toMatchObject({ name: B.name, updated_by: E.id });
  });

  it.each([
    ['blank', '   '],
    ['empty', ''],
    ['over-long', 'x'.repeat(NAME_MAX_LENGTH + 1)],
  ])('refuses a %s name as a field error on `name`, writing nothing', async (_, name) => {
    const issues = await refusal(setName(asUser(A), name));

    expect(issues).toEqual([{ path: ['name'], message: expect.any(String) }]);
    expect(await userRow(A.id)).toMatchObject({ name: A.name, updated_by: E.id });
  });

  it('takes a name of the longest length', async () => {
    const longest = 'x'.repeat(NAME_MAX_LENGTH);
    await expect(setName(asUser(A), longest)).resolves.toMatchObject({ name: longest });
  });

  it('refuses a provisional account, writing nothing', async () => {
    // Why it could have succeeded: the same call renames A once verified (above).
    await setVerified(A.id, false);

    await expect(setName(asUser(A), 'Fixture Renamed')).rejects.toBeInstanceOf(Forbidden);
    expect(await userRow(A.id)).toMatchObject({ name: A.name, updated_by: E.id });
  });
});
