import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { A, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';

// `setName` over the real schema: the renamed row back, and a refusal read
// as the browser reads it, a `VALIDATION` error pathed to `name` (MB.43).
// What the service refuses, and why, is services/name.test.ts's; a signed-out
// caller is tests/db/graphql-query-scopes.test.ts's.

const SET_NAME = /* GraphQL */ `
  mutation SetName($name: String!) {
    setName(name: $name) {
      id
      name
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
  await sql`update users set email_verified = true, name = ${A.name} where id = ${A.id}`;
});

describe('the setName mutation', () => {
  it('answers the renamed row', async () => {
    const result = await run(asUser(A), SET_NAME, { name: ' Fixture Renamed ' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ setName: { id: A.id, name: 'Fixture Renamed' } });
  });

  // Why it could have answered: the same session renames above.
  it('answers a blank name as VALIDATION on `name`', async () => {
    const result = await run(asUser(A), SET_NAME, { name: ' ' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      path: ['setName'],
      extensions: { code: 'VALIDATION', fieldErrors: [{ path: ['name'] }] },
    });
  });
});
