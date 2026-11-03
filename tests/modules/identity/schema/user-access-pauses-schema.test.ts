import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import {
  findStandingUserAccessPause,
  findStandingUserAccessPausesFor,
  findUserAccessPausePage,
  withAudit,
} from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { userAccessPauses } from '@/modules/identity/schema/user-access-pauses';
import type { NamedWrites } from '@/db/types';

// A site admin's pause on a user's access, one row per pause so each keeps who set it, who lifted it and when.

const OWN_COLUMNS = ['id', 'user_id', 'until', 'note', 'message', 'lifted_at', 'lifted_by'];
const LIFTED_TOGETHER = 'user_access_pauses_lifted_together';
const ONE_LIVE = 'user_access_pauses_one_live';
const NOTE_NOT_BLANK = 'user_access_pauses_note_not_blank';
const ADMIN = E.id;
const PAUSED = A.id;

describe('user_access_pauses schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(userAccessPauses);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('declares until, the message and the lifted pair nullable, and the note required', () => {
    expect(byName.until.notNull).toBe(false);
    expect(byName.note.notNull).toBe(true);
    expect(byName.message.notNull).toBe(false);
    expect(byName.lifted_at.notNull).toBe(false);
    expect(byName.lifted_by.notNull).toBe(false);
  });

  it('declares its one-live index, partial', () => {
    expect(Object.keys(byIndexName)).toEqual([ONE_LIVE]);
    expect(byIndexName[ONE_LIVE].config.unique).toBe(true);
    expect(byIndexName[ONE_LIVE].config.where).toBeDefined();
  });

  it('has foreign keys to the paused account and to who lifted it', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)]).sort(),
    ).toEqual([
      ['lifted_by', 'users'],
      ['user_id', 'users'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

function livePause(userId = PAUSED) {
  return sql`
    insert into user_access_pauses (user_id, note, created_by, updated_by)
    values (${userId}, 'Testnote', ${ADMIN}, ${ADMIN}) returning *
  `;
}

function liftedPause() {
  return sql`
    insert into user_access_pauses (user_id, note, lifted_at, lifted_by, created_by, updated_by)
    values (${PAUSED}, 'Testnote', now(), ${ADMIN}, ${ADMIN}, ${ADMIN})
  `;
}

async function emptied(): Promise<void> {
  await sql`delete from sessions where token like 'pause-test-%'`;
  await sql`truncate user_access_pauses`;
}

describe('user_access_pauses table', () => {
  beforeEach(emptied);

  it('refuses a pause for no user', async () => {
    const error = await failureOf(sql`
      insert into user_access_pauses (user_id, note, created_by, updated_by)
      values (pg_catalog.gen_random_uuid(), 'Testnote', ${ADMIN}, ${ADMIN})
    `);

    // 23503 is foreign_key_violation.
    expect(error.code).toBe('23503');
  });

  it('accepts an open-ended pause with a note, not lifted', async () => {
    const [row] = await livePause();

    expect(row).toMatchObject({
      until: null,
      note: 'Testnote',
      message: null,
      lifted_at: null,
      lifted_by: null,
    });
  });

  it('holds a nullable message text column, kept as written', async () => {
    const [column] = await sql`
      select data_type, is_nullable from information_schema.columns
       where table_name = 'user_access_pauses' and column_name = 'message'`;
    const [row] = await sql`
      insert into user_access_pauses (user_id, note, message, created_by, updated_by)
      values (${PAUSED}, 'Testnote', 'Paused while we look into a report.', ${ADMIN}, ${ADMIN}) returning message`;

    expect(column).toEqual({ data_type: 'text', is_nullable: 'YES' });
    expect(row.message).toBe('Paused while we look into a report.');
  });

  it('refuses a pause with no note, and one whose note is blank', async () => {
    const none = await failureOf(sql`
      insert into user_access_pauses (user_id, created_by, updated_by)
      values (${PAUSED}, ${ADMIN}, ${ADMIN})
    `);
    const blank = await failureOf(sql`
      insert into user_access_pauses (user_id, note, created_by, updated_by)
      values (${PAUSED}, ' \t ', ${ADMIN}, ${ADMIN})
    `);

    // 23502 is not_null_violation; 23514 is check_violation.
    expect(none.code).toBe('23502');
    expect(none.column_name).toBe('note');
    expect(blank.code).toBe('23514');
    expect(blank.constraint_name).toBe(NOTE_NOT_BLANK);
    // The precondition: the same row with a note goes in.
    await livePause();
  });

  it('refuses a second live pause for the same user', async () => {
    await livePause();

    const second = await failureOf(livePause());

    // 23505 is unique_violation: the one-live index.
    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(ONE_LIVE);
  });

  // The index reaches one user's live pause alone: another user's, and any number of lifted rows beside it, pass.
  it('takes a live pause for another user, and any number of lifted ones beside a live one', async () => {
    await liftedPause();
    await liftedPause();
    await livePause();
    await livePause(B.id);

    const [{ count }] = await sql`select count(*)::int as count from user_access_pauses`;
    expect(count).toBe(4);
  });

  // An expired pause still holds the slot: `until` passing cannot sit in an index predicate, since now() is not immutable.
  it('counts a live pause whose until has passed as live', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, until, created_by, updated_by)
      values (${PAUSED}, 'Testnote', now() - interval '1 day', ${ADMIN}, ${ADMIN})
    `;

    const second = await failureOf(livePause());

    expect(second.constraint_name).toBe(ONE_LIVE);
  });

  it('refuses a lifted_at without lifted_by, and a lifted_by without lifted_at', async () => {
    const noBy = await failureOf(sql`
      insert into user_access_pauses (user_id, note, lifted_at, created_by, updated_by)
      values (${PAUSED}, 'Testnote', now(), ${ADMIN}, ${ADMIN})
    `);
    const noAt = await failureOf(sql`
      insert into user_access_pauses (user_id, note, lifted_by, created_by, updated_by)
      values (${PAUSED}, 'Testnote', ${ADMIN}, ${ADMIN}, ${ADMIN})
    `);

    // 23514 is check_violation.
    expect([noBy.code, noAt.code]).toEqual(['23514', '23514']);
    expect([noBy.constraint_name, noAt.constraint_name]).toEqual([
      LIFTED_TOGETHER,
      LIFTED_TOGETHER,
    ]);
  });
});

// The repository's surface: setting and lifting under the `SiteAdmin` proof, the standing pause for a user, and every pause for a user.
// The table is marked `namedWrites`, so every generic write is refused at compile time (user-access-pauses-schema.type-check.ts).
describe('the repository', () => {
  const admin = assertSiteAdmin(asUser(E));
  /** The first page of a user's pauses, its rows alone. */
  const historyOf = async (userId: string) =>
    (await findUserAccessPausePage(admin, userId, { limit: 25, inverted: false })).map(
      (entry) => entry.node,
    );
  const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

  beforeEach(emptied);

  it('reads no standing pause, then the one set, stamped from the session', async () => {
    expect(await findStandingUserAccessPause(PAUSED)).toBeUndefined();

    const until = tomorrow();
    const set = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until, note: 'Testnote' }),
    );

    expect(set).toHaveLength(1);
    expect(set[0]).toMatchObject({
      userId: PAUSED,
      until,
      note: 'Testnote',
      createdBy: ADMIN,
      updatedBy: ADMIN,
      liftedAt: null,
      liftedBy: null,
    });
    expect(await findStandingUserAccessPause(PAUSED)).toEqual(set[0]);
  });

  it('reads an open-ended pause as standing', async () => {
    const [set] = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    expect(await findStandingUserAccessPause(PAUSED)).toEqual(set);
  });

  // The row is live, so the index still counts it, but the pause no longer stands: the user is let back in with no write.
  it('reads a live pause whose until has passed as not standing', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, until, created_by, updated_by)
      values (${PAUSED}, 'Testnote', now() - interval '1 minute', ${ADMIN}, ${ADMIN})
    `;

    expect(await findStandingUserAccessPause(PAUSED)).toBeUndefined();
  });

  it('reads no standing pause for another user than the paused one', async () => {
    await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    expect(await findStandingUserAccessPause(B.id)).toBeUndefined();
  });

  it('reads no soft-deleted pause as standing', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, created_by, updated_by, deleted_at, deleted_by)
      values (${PAUSED}, 'Testnote', ${ADMIN}, ${ADMIN}, now(), ${ADMIN})
    `;

    expect(await findStandingUserAccessPause(PAUSED)).toBeUndefined();
  });

  // A is no keeper, but the writer stamps whoever the session names: the stamps below can only have come from the session, not from E's proof.
  it('lifts the standing pause, stamping lifted_by and updated_by from the session', async () => {
    const [set] = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    const lifted = await withAudit(asUser(A), (write) => write.liftUserAccessPause(admin, PAUSED));

    expect(lifted).toHaveLength(1);
    expect(lifted[0]).toMatchObject({
      id: set?.id,
      createdBy: ADMIN,
      updatedBy: A.id,
      liftedBy: A.id,
    });
    expect(lifted[0]?.liftedAt).toBeInstanceOf(Date);
    expect(await findStandingUserAccessPause(PAUSED)).toBeUndefined();
  });

  // A pause that ran out ended by itself; lifting it would record a keeper ending what had already ended.
  it('lifts nothing when no pause stands, an expired one included', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, until, created_by, updated_by)
      values (${PAUSED}, 'Testnote', now() - interval '1 minute', ${ADMIN}, ${ADMIN})
    `;

    const lifted = await withAudit(asUser(E), (write) => write.liftUserAccessPause(admin, PAUSED));

    expect(lifted).toEqual([]);
    const [row] = await sql`select lifted_at from user_access_pauses`;
    expect(row.lifted_at).toBeNull();
  });

  it("lifts only the named user's pause", async () => {
    await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    const lifted = await withAudit(asUser(E), (write) => write.liftUserAccessPause(admin, B.id));

    expect(lifted).toEqual([]);
    expect(await findStandingUserAccessPause(PAUSED)).toBeDefined();
  });

  // The set writer frees the one-live slot first: the expired row it closes keeps its until, so it still reads as having run out on its own.
  it('sets a new pause over an expired one, closing the expired row from the session', async () => {
    const [expired] = await sql`
      insert into user_access_pauses (user_id, note, until, created_by, updated_by)
      values (${PAUSED}, 'Testnote', now() - interval '1 minute', ${ADMIN}, ${ADMIN}) returning id, until
    `;

    const set = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    expect(set).toHaveLength(1);
    expect(await findStandingUserAccessPause(PAUSED)).toEqual(set[0]);
    const [closed] = await sql`
      select until, lifted_at, lifted_by from user_access_pauses where id = ${expired.id}
    `;
    expect(closed.until).toEqual(expired.until);
    expect(closed.lifted_by).toBe(ADMIN);
    expect(closed.lifted_at).toBeInstanceOf(Date);
  });

  it('sets a new pause over a standing one, replacing it', async () => {
    const [first] = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: tomorrow(), note: 'Testnote' }),
    );

    const [second] = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    expect(second?.id).not.toBe(first?.id);
    expect(await findStandingUserAccessPause(PAUSED)).toEqual(second);
    const history = await historyOf(PAUSED);
    expect(history.find((row) => row.id === first?.id)).toMatchObject({ liftedBy: ADMIN });
  });

  it("ends every session of the paused user in the same write, and no other user's", async () => {
    const session = (userId: string, token: string) => sql`
      insert into sessions (token, user_id, expires_at, updated_at)
      values (${token}, ${userId}, now() + interval '1 day', now())
    `;
    await session(PAUSED, 'pause-test-a-1');
    await session(PAUSED, 'pause-test-a-2');
    await session(B.id, 'pause-test-b');
    const tokensOf = async (userId: string) =>
      (
        await sql`select token from sessions where user_id = ${userId} and token like 'pause-test-%'`
      ).map((row) => row.token);
    // The precondition: the paused user holds two sessions before the pause.
    expect(await tokensOf(PAUSED)).toHaveLength(2);

    await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    expect(await tokensOf(PAUSED)).toEqual([]);
    expect(await tokensOf(B.id)).toEqual(['pause-test-b']);
  });

  it("reads every pause for a user, newest first, and no other user's", async () => {
    await sql`
      insert into user_access_pauses (user_id, note, lifted_at, lifted_by, created_at, created_by, updated_by)
      values (${PAUSED}, 'Testnote', now(), ${ADMIN}, now() - interval '2 days', ${ADMIN}, ${ADMIN}),
             (${B.id}, 'Testnote', null, null, now(), ${ADMIN}, ${ADMIN})
    `;
    const [standing] = await withAudit(asUser(E), (write) =>
      write.setUserAccessPause(admin, PAUSED, { until: null, note: 'Testnote' }),
    );

    const history = await historyOf(PAUSED);

    expect(history.map((row) => row.userId)).toEqual([PAUSED, PAUSED]);
    expect(history[0]).toEqual(standing);
    expect(history[1]?.liftedBy).toBe(ADMIN);
  });

  it('reads no soft-deleted pause into the history', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, created_by, updated_by, deleted_at, deleted_by)
      values (${PAUSED}, 'Testnote', ${ADMIN}, ${ADMIN}, now(), ${ADMIN})
    `;

    expect(await historyOf(PAUSED)).toEqual([]);
  });

  it('reads the standing pauses of the users asked for, and no expired, lifted, deleted or unasked one', async () => {
    // A standing, B run out, C lifted, D soft-deleted, F standing but not asked for; E has none.
    await sql`
      insert into user_access_pauses (user_id, note, until, lifted_at, lifted_by, deleted_at, deleted_by, created_by, updated_by)
      values (${A.id}, 'Testnote', null, null, null, null, null, ${ADMIN}, ${ADMIN}),
             (${B.id}, 'Testnote', now() - interval '1 minute', null, null, null, null, ${ADMIN}, ${ADMIN}),
             (${C.id}, 'Testnote', null, now(), ${ADMIN}, null, null, ${ADMIN}, ${ADMIN}),
             (${D.id}, 'Testnote', null, null, null, now(), ${ADMIN}, ${ADMIN}, ${ADMIN}),
             (${F.id}, 'Testnote', now() + interval '1 day', null, null, null, null, ${ADMIN}, ${ADMIN})
    `;

    const asked = await findStandingUserAccessPausesFor(admin, [A.id, B.id, C.id, D.id, E.id]);

    expect(asked.map((row) => row.userId)).toEqual([A.id]);
    // The precondition: F's pause stands, so its absence above is the id filter's doing.
    expect((await findStandingUserAccessPausesFor(admin, [F.id])).map((row) => row.userId)).toEqual(
      [F.id],
    );
    expect(await findStandingUserAccessPausesFor(admin, [])).toEqual([]);
  });

  it('adds no property to the table for drizzle-kit to see', () => {
    expect((userAccessPauses as NamedWrites).$writes).toBeUndefined();
  });
});
