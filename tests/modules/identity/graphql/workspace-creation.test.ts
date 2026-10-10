import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { A, E, asUser } from '../../../support/as-user';
import { asManualFix } from '../../../support/db/privileges';
import { run } from '../../../support/graphql/run';
import type { GrantedUserResult, RevokedUserResult } from './types';

// M5.8's `grantWorkspaceCreation` and `revokeWorkspaceCreation`, the transport's half
// (claude-docs/testing/layer-ownership.md): an admin's answer, and one refusal
// per error code, read as the browser reads them. Which roles the service
// refuses is services/workspace-creation.test.ts's; a signed-out caller is
// tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

afterAll(async () => {
  await sql.end();
});

const PENDING = '00000000-0000-0000-0000-0000000000c1';
const NOWHERE = '00000000-0000-0000-0000-0000000000c9';

beforeEach(async () => {
  // The ledger references the user each test writes it for.
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where id = ${PENDING}`;
  await sql`
    insert into users (id, name, email, can_create_workspace, created_by, updated_by)
    values (${PENDING}, 'Pending Fixturewort', 'pending@grant.test', false, ${PENDING}, ${PENDING})
  `;
});

const GRANT = `
  mutation ($userId: ID!) {
    grantWorkspaceCreation(userId: $userId) { id canCreateWorkspace }
  }
`;

// The schema's scope is a gate of its own in front of the service: a coven's
// owner holds the most a workspace role grants, and still not the site role.
it('is testing a session whose site role is `user`, beside an admin', () => {
  expect(asUser(A).role).toBe('user');
  expect(asUser(E).role).toBe('admin');
});

describe('Mutation.grantWorkspaceCreation', () => {
  it('answers an admin the user, now able to create a coven', async () => {
    const result = await run<GrantedUserResult>(asUser(E), GRANT, { userId: PENDING });

    expect(result.errors).toBeUndefined();
    expect(result.data?.grantWorkspaceCreation).toEqual({ id: PENDING, canCreateWorkspace: true });
  });

  it('refuses a coven owner as FORBIDDEN, the row left as it was', async () => {
    const result = await run(asUser(A), GRANT, { userId: PENDING });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [row] = await sql`select can_create_workspace from users where id = ${PENDING}`;
    expect(row).toEqual({ can_create_workspace: false });
  });

  it("answers a second approval as FORBIDDEN, with the service's message", async () => {
    await run(asUser(E), GRANT, { userId: PENDING });

    const result = await run(asUser(E), GRANT, { userId: PENDING });

    expect(result.errors?.[0]).toMatchObject({
      message: 'Pending Fixturewort may already create a coven',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  // The note travels; the actor does not: it is the session's, whatever the
  // request carries. An undeclared variable is dropped, and an argument the
  // field does not take fails validation before anything runs.
  it('keeps the note on the ledger row, its actor the session’s and never the request’s', async () => {
    const withNote = `
      mutation ($userId: ID!, $note: String) {
        grantWorkspaceCreation(userId: $userId, note: $note) { id }
      }
    `;
    const smuggled = await run(
      asUser(E),
      `
      mutation { grantWorkspaceCreation(userId: "${PENDING}", createdBy: "${A.id}") { id } }
    `,
    );
    expect(smuggled.errors?.[0]?.message).toMatch(/Unknown argument "createdBy"/);
    expect(await sql`select 1 from user_privilege_changes`).toHaveLength(0);

    const result = await run(asUser(E), withNote, {
      userId: PENDING,
      note: 'Runs the Tuesday circle',
      createdBy: A.id,
    });

    expect(result.errors).toBeUndefined();
    expect(
      await sql`select via::text, note, created_by from user_privilege_changes where user_id = ${PENDING}`,
    ).toEqual([{ via: 'admin', note: 'Runs the Tuesday circle', created_by: E.id }]);
  });

  it('answers an unknown id as NOT_FOUND', async () => {
    const result = await run(asUser(E), GRANT, { userId: NOWHERE });

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

const REVOKE = `
  mutation ($userId: ID!) {
    revokeWorkspaceCreation(userId: $userId) { id canCreateWorkspace }
  }
`;

describe('Mutation.revokeWorkspaceCreation', () => {
  beforeEach(async () => {
    await asManualFix(
      sql,
      (tx) => tx`update users set can_create_workspace = true where id = ${PENDING}`,
    );
  });

  it('answers an admin the user, no longer able to create a coven', async () => {
    const result = await run<RevokedUserResult>(asUser(E), REVOKE, { userId: PENDING });

    expect(result.errors).toBeUndefined();
    expect(result.data?.revokeWorkspaceCreation).toEqual({
      id: PENDING,
      canCreateWorkspace: false,
    });
  });

  it('refuses a coven owner as FORBIDDEN, the row left as it was', async () => {
    const result = await run(asUser(A), REVOKE, { userId: PENDING });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [row] = await sql`select can_create_workspace from users where id = ${PENDING}`;
    expect(row).toEqual({ can_create_workspace: true });
  });

  it("answers an admin's flag as FORBIDDEN, with the service's message", async () => {
    const result = await run(asUser(E), REVOKE, { userId: E.id });

    expect(result.errors?.[0]).toMatchObject({
      message: `${E.name} is an admin, and every admin may create a coven. Revoke their admin role first.`,
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('answers an unknown id as NOT_FOUND', async () => {
    const result = await run(asUser(E), REVOKE, { userId: NOWHERE });

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});
