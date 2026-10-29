import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, E, asUser } from '../../../support/as-user';
import { findOpenAdminRoleChangePause, withAudit } from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { adminRoleChangePauses } from '@/modules/identity/schema/admin-role-change-pauses';
import type { NamedWrites } from '@/db/types';
import type { PauseRow } from './types';

// The pause switch, table half. One row per pause rather than one row of settings, so no migration seeds a row it has no user to stamp with, and every pause keeps who began it and who ended it
// (claude-docs/design-decisions/mb.62-pause-ledger.md).

const ENDED_TOGETHER = 'admin_role_change_pauses_ended_together';
const ONE_OPEN = 'admin_role_change_pauses_one_open';

describe('admin_role_change_pauses schema', () => {
  const { byName } = tableFacts(adminRoleChangePauses);

  it('has the ended pair and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'ended_at', 'ended_by', ...AUDIT_COLUMNS].sort(),
    );
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const ADMIN = E.id;

async function everyPause(): Promise<PauseRow[]> {
  return sql<PauseRow[]>`
    select created_by, updated_by, ended_by, ended_at is not null as ended
    from admin_role_change_pauses
    order by created_at, ended_at nulls last
  `;
}

function openPause() {
  return sql`
    insert into admin_role_change_pauses (created_by, updated_by)
    values (${ADMIN}, ${ADMIN})
  `;
}

function endedPause() {
  return sql`
    insert into admin_role_change_pauses (ended_at, ended_by, created_by, updated_by)
    values (now(), ${ADMIN}, ${ADMIN}, ${ADMIN})
  `;
}

async function emptied(): Promise<void> {
  await sql`truncate admin_role_change_pauses`;
}

describe('admin_role_change_pauses table', () => {
  beforeEach(emptied);

  it('refuses a second open pause', async () => {
    await openPause();

    const second = await failureOf(openPause());

    // 23505 is unique_violation: the one-open index.
    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(ONE_OPEN);
  });

  // The index's reach is the open pause alone: the history beside it is
  // unbounded, which is what makes it a ledger.
  it('takes any number of ended pauses beside the one open', async () => {
    await endedPause();
    await endedPause();
    await openPause();

    expect(await everyPause()).toHaveLength(3);
  });

  it('refuses an ended_at without ended_by, and an ended_by without ended_at', async () => {
    const noBy = await failureOf(sql`
      insert into admin_role_change_pauses (ended_at, created_by, updated_by)
      values (now(), ${ADMIN}, ${ADMIN})
    `);
    const noAt = await failureOf(sql`
      insert into admin_role_change_pauses (ended_by, created_by, updated_by)
      values (${ADMIN}, ${ADMIN}, ${ADMIN})
    `);

    // 23514 is check_violation.
    expect([noBy.code, noAt.code]).toEqual(['23514', '23514']);
    expect([noBy.constraint_name, noAt.constraint_name]).toEqual([ENDED_TOGETHER, ENDED_TOGETHER]);
  });
});

// The repository's surface is three named calls under the `SiteAdmin` proof: the open pause, opening one, and ending it.
// The table is marked `namedWrites`, so every generic write is refused at compile time: a pause cannot be backdated, reopened or deleted, and its ended pair is stamped from the session.
describe('the repository', () => {
  const admin = assertSiteAdmin(asUser(E));

  beforeEach(emptied);

  it('reads no open pause, then the one opened, stamped from the session', async () => {
    expect(await findOpenAdminRoleChangePause(admin)).toBeUndefined();

    const opened = await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({ createdBy: ADMIN, updatedBy: ADMIN, endedAt: null });
    expect(await findOpenAdminRoleChangePause(admin)).toEqual(opened[0]);
  });

  // A is no admin, but the writer stamps whoever the session names: the
  // stamps below can only have come from the session, not from E's proof.
  it('ends the open pause, stamping ended_by and updated_by from the session', async () => {
    const [opened] = await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    const ended = await withAudit(asUser(A), (write) => write.resumeAdminRoleChanges(admin));

    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({
      id: opened?.id,
      createdBy: ADMIN,
      updatedBy: A.id,
      endedBy: A.id,
    });
    expect(ended[0]?.endedAt).toBeInstanceOf(Date);
    expect(await findOpenAdminRoleChangePause(admin)).toBeUndefined();
  });

  // The compile-time half of the mark is admin-role-change-pauses-schema.type-check.ts.
  it('adds no property to the table for drizzle-kit to see', () => {
    expect((adminRoleChangePauses as NamedWrites).$writes).toBeUndefined();
  });
});
