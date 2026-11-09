import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { A, E, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';
import { useTestDatabase } from '../../../support/db/database';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate admin_role_change_pauses`;
  // E is the seed's admin; the variable names it the primary keeper here.
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', E.email);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Mutation.pauseAdminRoleChanges and resumeAdminRoleChanges', () => {
  it('answers the primary keeper the state, each stamped as it, whatever the request names', async () => {
    const paused = await run(asUser(E), 'mutation { pauseAdminRoleChanges }', { createdBy: A.id });
    expect(paused).toEqual({ data: { pauseAdminRoleChanges: true } });

    const resumed = await run(asUser(E), 'mutation { resumeAdminRoleChanges }', { endedBy: A.id });
    expect(resumed).toEqual({ data: { resumeAdminRoleChanges: false } });

    expect(await sql`select created_by, ended_by from admin_role_change_pauses`).toEqual([
      { created_by: E.id, ended_by: E.id },
    ]);
  });

  // E is a keeper the scope admits, so the refusal is the service's.
  it('answers another keeper as FORBIDDEN', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'somebody-else@admin-role-pause-graphql.test');

    const result = await run(asUser(E), 'mutation { pauseAdminRoleChanges }');

    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(await sql`select 1 from admin_role_change_pauses`).toHaveLength(0);
  });
});
