import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { A, E, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';

// MB.63's `pauseAdminRoleChanges` and `resumeAdminRoleChanges`, the
// transport's half (claude-docs/testing/layer-ownership.md): the primary
// admin's answer and the stamps, and one refusal, read as the browser reads
// them. Which callers the service refuses is
// services/admin-role-pause.test.ts's; the scope is
// tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate admin_role_change_pauses`;
  // E is the seed's admin; the variable names it the primary admin here.
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', E.email);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Mutation.pauseAdminRoleChanges and resumeAdminRoleChanges', () => {
  it('answers the primary admin the state, each stamped as it, whatever the request names', async () => {
    const paused = await run(asUser(E), 'mutation { pauseAdminRoleChanges }', { createdBy: A.id });
    expect(paused).toEqual({ data: { pauseAdminRoleChanges: true } });

    const resumed = await run(asUser(E), 'mutation { resumeAdminRoleChanges }', { endedBy: A.id });
    expect(resumed).toEqual({ data: { resumeAdminRoleChanges: false } });

    expect(await sql`select created_by, ended_by from admin_role_change_pauses`).toEqual([
      { created_by: E.id, ended_by: E.id },
    ]);
  });

  it('takes no argument, so no actor can be named', async () => {
    const result = await run(asUser(E), `mutation { pauseAdminRoleChanges(createdBy: "${A.id}") }`);

    expect(result.errors?.[0]?.message).toMatch(/Unknown argument "createdBy"/);
    expect(await sql`select 1 from admin_role_change_pauses`).toHaveLength(0);
  });

  // E is an admin the scope admits, so the refusal is the service's.
  it('answers another admin as FORBIDDEN', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'somebody-else@admin-role-pause-graphql.test');

    const result = await run(asUser(E), 'mutation { pauseAdminRoleChanges }');

    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(await sql`select 1 from admin_role_change_pauses`).toHaveLength(0);
  });
});
