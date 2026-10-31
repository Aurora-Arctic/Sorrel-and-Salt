import { describe, expect, it } from 'vitest';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { sql, useProbeTables } from '../support/db/probe-tables';

// The seeded System account a job writes as; a real run writing as it is tests/workflows/audited-write.test.ts
// (claude-docs/design-decisions/m15.49-job-mechanism.md).

useProbeTables();

describe('the System actor', () => {
  it('is a live account that holds no seat, no sign-in and no right to create a coven', async () => {
    const [account] = await sql`
      select deleted_at, can_create_workspace, role::text as role from users where id = ${SYSTEM_ACTOR_ID}
    `;
    expect(account).toEqual({ deleted_at: null, can_create_workspace: false, role: 'user' });
    const [{ seats, accounts }] = await sql`
      select
        (select count(*)::int from workspace_members where user_id = ${SYSTEM_ACTOR_ID}) as seats,
        (select count(*)::int from accounts where user_id = ${SYSTEM_ACTOR_ID}) as accounts
    `;
    expect({ seats, accounts }).toEqual({ seats: 0, accounts: 0 });
  });
});
