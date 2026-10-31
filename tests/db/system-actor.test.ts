import { describe, expect, it } from 'vitest';
import { withAudit } from '@/db/repository';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { herbs, sql, useProbeTables } from '../support/db/probe-tables';

// A job's write is audited like any other: it names the seeded System account as its actor
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

  it('is the actor a job step writes under, through withAudit', async () => {
    // What a step does: opens `withAudit` with the System id, never an id from a request.
    const step = () =>
      withAudit({ userId: SYSTEM_ACTOR_ID }, async (write) => {
        const [row] = await write.insert(herbs, { name: 'Jobwort' });
        return row;
      });

    const row = await step();

    expect(row.actingUser).toBe(SYSTEM_ACTOR_ID);
    expect(row.createdBy).toBe(SYSTEM_ACTOR_ID);
    expect(row.updatedBy).toBe(SYSTEM_ACTOR_ID);
  });
});
