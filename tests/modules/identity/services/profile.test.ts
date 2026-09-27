import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { NotFound } from '@/lib/errors';
import { getMe } from '@/modules/identity';
import { A, B, asUser } from '../../../support/as-user';

// `me` has one reader: the session's own user. No id is taken, so there is no
// other user's row for a caller to name.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

afterAll(async () => {
  await sql.end();
});

describe('getMe', () => {
  it("answers the session's own user row", async () => {
    await expect(getMe(asUser(A))).resolves.toMatchObject({
      id: A.id,
      name: A.name,
      email: A.email,
      role: 'user',
    });
  });

  it('refuses with NotFound once the row is soft-deleted, though the session outlives it', async () => {
    // Why this could have answered: the same call finds B before the delete.
    await expect(getMe(asUser(B))).resolves.toMatchObject({ id: B.id });

    await sql`update users set deleted_at = now(), deleted_by = ${B.id} where id = ${B.id}`;

    await expect(getMe(asUser(B))).rejects.toBeInstanceOf(NotFound);
  });
});
