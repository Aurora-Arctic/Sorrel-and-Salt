import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { findStandingSupportTimeoutsFor } from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { asUser } from '../../../support/as-user';
import { supportTimeouts } from '@/modules/support/schema/support-timeouts';

const OWN_COLUMNS = ['id', 'user_id', 'until', 'note', 'lifted_at'];
const ACTIVE_INDEX = 'support_timeouts_user_until_idx';
const ADMIN = FIXTURE_USERS.E.id;
const SENDER = FIXTURE_USERS.A.id;

describe('support_timeouts schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(supportTimeouts);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('declares nullable note and lifted_at, and a required until', () => {
    expect(byName.note.notNull).toBe(false);
    expect(byName.lifted_at.notNull).toBe(false);
    expect(byName.until.notNull).toBe(true);
  });

  it('declares its index over rows not yet lifted', () => {
    expect(Object.keys(byIndexName)).toEqual([ACTIVE_INDEX]);
    expect(byIndexName[ACTIVE_INDEX].config.where).toBeDefined();
  });

  it('has a foreign key to the account', () => {
    expect(nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)])).toEqual([
      ['user_id', 'users'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

describe('support_timeouts table', () => {
  it('refuses a time-out for no user', async () => {
    const error = await failureOf(
      sql`insert into support_timeouts (user_id, until, created_by, updated_by)
          values (pg_catalog.gen_random_uuid(), now() + interval '1 day', ${ADMIN}, ${ADMIN})`,
    );

    expect(error.code).toBe('23503');
  });

  it('accepts a time-out with no note and not lifted', async () => {
    const [row] = await sql`
      insert into support_timeouts (user_id, until, created_by, updated_by)
      values (${SENDER}, now() + interval '1 day', ${ADMIN}, ${ADMIN}) returning *`;

    expect(row.note).toBeNull();
    expect(row.lifted_at).toBeNull();
  });
});

describe('the repository', () => {
  const { A, B, C, D, E, F } = FIXTURE_USERS;
  const admin = assertSiteAdmin(asUser(E));

  beforeEach(async () => {
    await sql`truncate support_timeouts`;
  });

  it('reads the standing time-outs of the users asked for, and no expired, lifted, deleted or unasked one', async () => {
    // A standing, B run out, C lifted, D soft-deleted, F standing but not asked for; E has none.
    await sql`
      insert into support_timeouts (user_id, until, lifted_at, deleted_at, deleted_by, created_by, updated_by)
      values (${A.id}, now() + interval '1 day', null, null, null, ${ADMIN}, ${ADMIN}),
             (${B.id}, now() - interval '1 minute', null, null, null, ${ADMIN}, ${ADMIN}),
             (${C.id}, now() + interval '1 day', now(), null, null, ${ADMIN}, ${ADMIN}),
             (${D.id}, now() + interval '1 day', null, now(), ${ADMIN}, ${ADMIN}, ${ADMIN}),
             (${F.id}, now() + interval '1 day', null, null, null, ${ADMIN}, ${ADMIN})
    `;

    const asked = await findStandingSupportTimeoutsFor(admin, [A.id, B.id, C.id, D.id, E.id]);

    expect(asked.map((row) => row.userId)).toEqual([A.id]);
    // The precondition: F's time-out stands, so its absence above is the id filter's doing.
    expect((await findStandingSupportTimeoutsFor(admin, [F.id])).map((row) => row.userId)).toEqual([
      F.id,
    ]);
    expect(await findStandingSupportTimeoutsFor(admin, [])).toEqual([]);
  });
});
