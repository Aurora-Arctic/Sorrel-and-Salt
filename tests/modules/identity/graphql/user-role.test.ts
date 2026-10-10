import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { A, E, asUser } from '../../../support/as-user';
import { asManualFix } from '../../../support/db/privileges';
import { run } from '../../../support/graphql/run';
import type { SetUserRoleResult } from './types';

// MB.59's `setUserRole`, the transport's half (claude-docs/testing/layer-ownership.md):
// an admin's answer, the reason reaching the ledger, and one refusal per error
// code, read as the browser reads them. Which callers and targets the service
// refuses is services/user-role.test.ts's; a signed-out caller and the scope
// are tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

const GRANTEE = '00000000-0000-0000-0000-0000000000e1';
const NOWHERE = '00000000-0000-0000-0000-0000000000e9';

beforeEach(async () => {
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where id = ${GRANTEE}`;
  await sql`
    insert into users (id, name, email, created_by, updated_by)
    values (${GRANTEE}, 'Grantee Fixturewort', 'grantee@user-role-graphql.test', ${GRANTEE}, ${GRANTEE})
  `;
});

const SET_ROLE = `
  mutation ($userId: ID!, $role: UserRole!, $note: String) {
    setUserRole(userId: $userId, role: $role, note: $note) { id role canCreateWorkspace }
  }
`;

it('is testing a session whose site role is `user`, beside an admin', () => {
  expect(asUser(A).role).toBe('user');
  expect(asUser(E).role).toBe('admin');
});

describe('Mutation.setUserRole', () => {
  it('answers an admin the user, now an admin who may create a coven, the reason on the ledger', async () => {
    const result = await run<SetUserRoleResult>(asUser(E), SET_ROLE, {
      userId: GRANTEE,
      role: 'admin',
      note: 'Curates the planets',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.setUserRole).toEqual({
      id: GRANTEE,
      role: 'admin',
      canCreateWorkspace: true,
    });
    const rows = await sql`
      select privilege::text, note, created_by from user_privilege_changes order by privilege
    `;
    expect(rows).toEqual([
      { privilege: 'admin', note: 'Curates the planets', created_by: E.id },
      { privilege: 'create_workspace', note: 'Curates the planets', created_by: E.id },
    ]);
  });

  it('answers a revoke the user, no longer an admin', async () => {
    await asManualFix(
      sql,
      (tx) =>
        tx`update users set role = 'admin', can_create_workspace = true where id = ${GRANTEE}`,
    );

    const result = await run<SetUserRoleResult>(asUser(E), SET_ROLE, {
      userId: GRANTEE,
      role: 'user',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.setUserRole).toEqual({
      id: GRANTEE,
      role: 'user',
      canCreateWorkspace: true,
    });
  });

  it('refuses a coven owner as FORBIDDEN, the row left as it was', async () => {
    const result = await run(asUser(A), SET_ROLE, { userId: GRANTEE, role: 'admin' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [row] = await sql`select role::text from users where id = ${GRANTEE}`;
    expect(row).toEqual({ role: 'user' });
  });

  it("answers a grant to an admin as FORBIDDEN, with the service's message", async () => {
    const result = await run(asUser(E), SET_ROLE, { userId: E.id, role: 'admin' });

    expect(result.errors?.[0]).toMatchObject({
      message: `${E.name} is already an admin`,
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('answers an unknown id as NOT_FOUND', async () => {
    const result = await run(asUser(E), SET_ROLE, { userId: NOWHERE, role: 'admin' });

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});
