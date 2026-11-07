import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, B, C, D, asUser } from '../../../support/as-user';
import {
  findStandingWorkspaceMemberPause,
  findWorkspaceMemberPausePage,
  withAudit,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import type { Membership } from '@/modules/coven';
import { workspaceMemberPauses } from '@/modules/coven/schema/workspace-member-pauses';
import type { NamedWrites } from '@/db/types';

const OWN_COLUMNS = [
  'id',
  'workspace_id',
  'user_id',
  'until',
  'note',
  'message',
  'lifted_at',
  'lifted_by',
];
const LIFTED_TOGETHER = 'workspace_member_pauses_lifted_together';
const ONE_LIVE = 'workspace_member_pauses_one_live';
const OWNER = A.id;
const PAUSED = B.id;

describe('workspace_member_pauses schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(workspaceMemberPauses);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('declares until, note, message and the lifted pair nullable, and the coven and user not', () => {
    expect(byName.workspace_id.notNull).toBe(true);
    expect(byName.user_id.notNull).toBe(true);
    expect(byName.until.notNull).toBe(false);
    expect(byName.note.notNull).toBe(false);
    expect(byName.message.notNull).toBe(false);
    expect(byName.lifted_at.notNull).toBe(false);
    expect(byName.lifted_by.notNull).toBe(false);
  });

  it('declares its one-live index, partial', () => {
    expect(Object.keys(byIndexName)).toEqual([ONE_LIVE]);
    expect(byIndexName[ONE_LIVE].config.unique).toBe(true);
    expect(byIndexName[ONE_LIVE].config.where).toBeDefined();
  });

  it('has foreign keys to the coven, the paused account and who lifted it', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)]).sort(),
    ).toEqual([
      ['lifted_by', 'users'],
      ['user_id', 'users'],
      ['workspace_id', 'workspaces'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

function livePause(userId = PAUSED, workspaceId = WORKSPACE_W_ID) {
  return sql`
    insert into workspace_member_pauses (workspace_id, user_id, created_by, updated_by)
    values (${workspaceId}, ${userId}, ${OWNER}, ${OWNER}) returning *
  `;
}

function liftedPause() {
  return sql`
    insert into workspace_member_pauses (workspace_id, user_id, lifted_at, lifted_by, created_by, updated_by)
    values (${WORKSPACE_W_ID}, ${PAUSED}, now(), ${OWNER}, ${OWNER}, ${OWNER})
  `;
}

function expiredPause() {
  return sql`
    insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
    values (${WORKSPACE_W_ID}, ${PAUSED}, now() - interval '1 minute', ${OWNER}, ${OWNER}) returning id, until
  `;
}

async function emptied(): Promise<void> {
  await sql`truncate workspace_member_pauses`;
}

describe('workspace_member_pauses table', () => {
  beforeEach(emptied);

  it('refuses a pause in no coven, and a pause for no user', async () => {
    const noCoven = await failureOf(livePause(PAUSED, crypto.randomUUID()));
    const noUser = await failureOf(livePause(crypto.randomUUID()));

    expect([noCoven.code, noUser.code]).toEqual(['23503', '23503']);
  });

  it('accepts an open-ended pause with no note, not lifted', async () => {
    const [row] = await livePause();

    expect(row).toMatchObject({
      until: null,
      note: null,
      message: null,
      lifted_at: null,
      lifted_by: null,
    });
  });

  it('holds a nullable message text column, kept as written', async () => {
    const [column] = await sql`
      select data_type, is_nullable from information_schema.columns
       where table_name = 'workspace_member_pauses' and column_name = 'message'`;
    const [row] = await sql`
      insert into workspace_member_pauses (workspace_id, user_id, message, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${PAUSED}, 'A short break while we talk.', ${OWNER}, ${OWNER}) returning message`;

    expect(column).toEqual({ data_type: 'text', is_nullable: 'YES' });
    expect(row.message).toBe('A short break while we talk.');
  });

  it('refuses a second live pause for the same user in the same coven', async () => {
    await livePause();

    const second = await failureOf(livePause());

    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(ONE_LIVE);
  });

  it('takes a live pause for the same user in another coven, for another user, and lifted ones beside a live one', async () => {
    await liftedPause();
    await liftedPause();
    await livePause();
    await livePause(PAUSED, WORKSPACE_X_ID);
    await livePause(C.id);

    const [{ count }] = await sql`select count(*)::int as count from workspace_member_pauses`;
    expect(count).toBe(5);
  });

  // An expired pause still holds the slot: `until` passing cannot sit in an index predicate, since now() is not immutable.
  it('counts a live pause whose until has passed as live', async () => {
    await expiredPause();

    const second = await failureOf(livePause());

    expect(second.constraint_name).toBe(ONE_LIVE);
  });

  it('refuses a lifted_at without lifted_by, and a lifted_by without lifted_at', async () => {
    const noBy = await failureOf(sql`
      insert into workspace_member_pauses (workspace_id, user_id, lifted_at, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${PAUSED}, now(), ${OWNER}, ${OWNER})
    `);
    const noAt = await failureOf(sql`
      insert into workspace_member_pauses (workspace_id, user_id, lifted_by, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${PAUSED}, ${OWNER}, ${OWNER}, ${OWNER})
    `);

    expect([noBy.code, noAt.code]).toEqual(['23514', '23514']);
    expect([noBy.constraint_name, noAt.constraint_name]).toEqual([
      LIFTED_TOGETHER,
      LIFTED_TOGETHER,
    ]);
  });
});

describe('the repository', () => {
  let inW: Membership;
  let inX: Membership;
  const historyOf = async (membership: Membership, userId?: string) =>
    (await findWorkspaceMemberPausePage(membership, { limit: 25, inverted: false }, userId)).map(
      (entry) => entry.node,
    );
  const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
  const setInW = (until: Date | null = null, note: string | null = null) =>
    withAudit(asUser(A), (write) => write.setWorkspaceMemberPause(inW, PAUSED, { until, note }));

  beforeEach(async () => {
    await emptied();
    inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { workspace: ['read'] });
    inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { workspace: ['read'] });
  });

  it("reads no standing pause, then the one set, in the proof's coven and stamped from the session", async () => {
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toBeUndefined();

    const until = tomorrow();
    const set = await setInW(until, 'Testnote');

    expect(set).toHaveLength(1);
    expect(set[0]).toMatchObject({
      workspaceId: WORKSPACE_W_ID,
      userId: PAUSED,
      until,
      note: 'Testnote',
      createdBy: OWNER,
      updatedBy: OWNER,
      liftedAt: null,
      liftedBy: null,
    });
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toEqual(set[0]);
  });

  it('reads an open-ended pause as standing', async () => {
    const [set] = await setInW();

    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toEqual(set);
  });

  // The row is live, so the index still counts it, but the pause no longer stands: the member is let back in with no write.
  it('reads a live pause whose until has passed as not standing', async () => {
    await expiredPause();

    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toBeUndefined();
  });

  it('reads no soft-deleted pause as standing', async () => {
    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, created_by, updated_by, deleted_at, deleted_by)
      values (${WORKSPACE_W_ID}, ${PAUSED}, ${OWNER}, ${OWNER}, now(), ${OWNER})
    `;

    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toBeUndefined();
  });

  it('reads no standing pause for another member than the paused one', async () => {
    await setInW();

    expect(await findStandingWorkspaceMemberPause(inW, C.id)).toBeUndefined();
  });

  // Rule 5: the proof's workspace_id is ANDed. Why it could have succeeded: the pause stands and the user id is the paused one's.
  it("reads no standing pause in W through a proof for X, by the paused user's id", async () => {
    const [set] = await setInW();
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toEqual(set);

    expect(await findStandingWorkspaceMemberPause(inX, PAUSED)).toBeUndefined();
  });

  it("reads none of W's pauses through a proof for X, by the paused user's id or in the coven's whole list", async () => {
    const [set] = await setInW();
    expect(await historyOf(inW, PAUSED)).toEqual([set]);

    expect(await historyOf(inX, PAUSED)).toEqual([]);
    expect(await historyOf(inX)).toEqual([]);
  });

  // Why it could have succeeded: the same call through W's proof lifts it.
  it('lifts no pause in W through a proof for X, and the pause still stands', async () => {
    await setInW();

    const throughX = await withAudit(asUser(D), (write) =>
      write.liftWorkspaceMemberPause(inX, PAUSED),
    );

    expect(throughX).toEqual([]);
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toBeDefined();
    const throughW = await withAudit(asUser(A), (write) =>
      write.liftWorkspaceMemberPause(inW, PAUSED),
    );
    expect(throughW).toHaveLength(1);
  });

  // A set through X's proof lands in X: the proof, not an argument, names the coven, so W's standing pause is left as it was.
  it("sets a pause in the proof's coven only, leaving the same user's pause in W standing", async () => {
    const [inWRow] = await setInW();

    const [inXRow] = await withAudit(asUser(D), (write) =>
      write.setWorkspaceMemberPause(inX, PAUSED, { until: null, note: null }),
    );

    expect(inXRow?.workspaceId).toBe(WORKSPACE_X_ID);
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toEqual(inWRow);
  });

  // C is a viewer, not an owner, but the writer stamps whoever the session names: the stamps below can only have come from the session.
  it('lifts the standing pause, stamping lifted_by and updated_by from the session', async () => {
    const [set] = await setInW();

    const lifted = await withAudit(asUser(C), (write) =>
      write.liftWorkspaceMemberPause(inW, PAUSED),
    );

    expect(lifted).toHaveLength(1);
    expect(lifted[0]).toMatchObject({
      id: set?.id,
      createdBy: OWNER,
      updatedBy: C.id,
      liftedBy: C.id,
    });
    expect(lifted[0]?.liftedAt).toBeInstanceOf(Date);
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toBeUndefined();
  });

  // A pause that ran out ended by itself; lifting it would record an owner ending what had already ended.
  it('lifts nothing when no pause stands, an expired one included', async () => {
    await expiredPause();

    const lifted = await withAudit(asUser(A), (write) =>
      write.liftWorkspaceMemberPause(inW, PAUSED),
    );

    expect(lifted).toEqual([]);
    const [row] = await sql`select lifted_at from workspace_member_pauses`;
    expect(row.lifted_at).toBeNull();
  });

  it("lifts only the named member's pause", async () => {
    await setInW();

    const lifted = await withAudit(asUser(A), (write) => write.liftWorkspaceMemberPause(inW, C.id));

    expect(lifted).toEqual([]);
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toBeDefined();
  });

  // The set writer frees the one-live slot first: the expired row it closes keeps its until, so it still reads as having run out.
  it('sets a new pause over an expired one, closing the expired row from the session', async () => {
    const [expired] = await expiredPause();

    const set = await setInW();

    expect(set).toHaveLength(1);
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toEqual(set[0]);
    const [closed] = await sql`
      select until, lifted_at, lifted_by from workspace_member_pauses where id = ${expired.id}
    `;
    expect(closed.until).toEqual(expired.until);
    expect(closed.lifted_by).toBe(OWNER);
    expect(closed.lifted_at).toBeInstanceOf(Date);
  });

  it('sets a new pause over a standing one, replacing it', async () => {
    const [first] = await setInW(tomorrow());

    const [second] = await setInW(null, 'Testnote');

    expect(second?.id).not.toBe(first?.id);
    expect(await findStandingWorkspaceMemberPause(inW, PAUSED)).toEqual(second);
    const history = await historyOf(inW, PAUSED);
    expect(history.find((row) => row.id === first?.id)).toMatchObject({ liftedBy: OWNER });
  });

  it("reads the coven's pauses newest first, every member's or one member's, and no other coven's", async () => {
    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, lifted_at, lifted_by, created_at, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${PAUSED}, now(), ${OWNER}, now() - interval '2 days', ${OWNER}, ${OWNER}),
             (${WORKSPACE_W_ID}, ${C.id}, null, null, now() - interval '1 day', ${OWNER}, ${OWNER}),
             (${WORKSPACE_X_ID}, ${PAUSED}, null, null, now(), ${OWNER}, ${OWNER})
    `;
    const [standing] = await setInW();

    const all = await historyOf(inW);
    const one = await historyOf(inW, PAUSED);

    expect(all.map((row) => [row.workspaceId, row.userId])).toEqual([
      [WORKSPACE_W_ID, PAUSED],
      [WORKSPACE_W_ID, C.id],
      [WORKSPACE_W_ID, PAUSED],
    ]);
    expect(all[0]).toEqual(standing);
    expect(one.map((row) => row.userId)).toEqual([PAUSED, PAUSED]);
    expect(one[1]?.liftedBy).toBe(OWNER);
  });

  it('reads no soft-deleted pause into the list', async () => {
    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, created_by, updated_by, deleted_at, deleted_by)
      values (${WORKSPACE_W_ID}, ${PAUSED}, ${OWNER}, ${OWNER}, now(), ${OWNER})
    `;

    expect(await historyOf(inW)).toEqual([]);
  });

  it('adds no property to the table for drizzle-kit to see', () => {
    expect((workspaceMemberPauses as NamedWrites).$writes).toBeUndefined();
  });
});
