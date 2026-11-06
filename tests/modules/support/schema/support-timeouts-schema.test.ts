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

const OWN_COLUMNS = ['id', 'user_id', 'until', 'note', 'message', 'lifted_at', 'address_key'];
const ACTIVE_INDEX = 'support_timeouts_user_until_idx';
const ADDRESS_INDEX = 'support_timeouts_address_key_idx';
const ADMIN = FIXTURE_USERS.E.id;
const SENDER = FIXTURE_USERS.A.id;

describe('support_timeouts schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(supportTimeouts);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('declares a required note, and nullable until, message and lifted_at', () => {
    expect(byName.note.notNull).toBe(true);
    expect(byName.until.notNull).toBe(false);
    expect(byName.message.notNull).toBe(false);
    expect(byName.lifted_at.notNull).toBe(false);
  });

  it('declares its index over rows not yet lifted', () => {
    expect(Object.keys(byIndexName).sort()).toEqual([ADDRESS_INDEX, ACTIVE_INDEX].sort());
    expect(byIndexName[ACTIVE_INDEX].config.where).toBeDefined();
    expect(byIndexName[ADDRESS_INDEX].config.where).toBeDefined();
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
      sql`insert into support_timeouts (user_id, until, note, created_by, updated_by)
          values (pg_catalog.gen_random_uuid(), now() + interval '1 day', 'Spam', ${ADMIN}, ${ADMIN})`,
    );

    expect(error.code).toBe('23503');
  });

  it('accepts a time-out with no end date, a note and not lifted', async () => {
    const [row] = await sql`
      insert into support_timeouts (user_id, until, note, created_by, updated_by)
      values (${SENDER}, null, 'Spam', ${ADMIN}, ${ADMIN}) returning *`;

    expect(row.until).toBeNull();
    expect(row.note).toBe('Spam');
    expect(row.lifted_at).toBeNull();
    expect(row.message).toBeNull();
  });

  it('holds a nullable message text column, kept as written', async () => {
    const [column] = await sql`
      select data_type, is_nullable from information_schema.columns
       where table_name = 'support_timeouts' and column_name = 'message'`;
    const [row] = await sql`
      insert into support_timeouts (user_id, note, message, created_by, updated_by)
      values (${SENDER}, 'Spam', 'One problem per request, please.', ${ADMIN}, ${ADMIN}) returning message`;

    expect(column).toEqual({ data_type: 'text', is_nullable: 'YES' });
    expect(row.message).toBe('One problem per request, please.');
  });

  it('refuses a time-out with no note', async () => {
    const error = await failureOf(
      sql`insert into support_timeouts (user_id, until, created_by, updated_by)
          values (${SENDER}, now() + interval '1 day', ${ADMIN}, ${ADMIN})`,
    );

    expect(error.code).toBe('23502');
  });

  it('refuses a time-out whose note is blank', async () => {
    const error = await failureOf(
      sql`insert into support_timeouts (user_id, until, note, created_by, updated_by)
          values (${SENDER}, null, '   ', ${ADMIN}, ${ADMIN})`,
    );

    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe('support_timeouts_note_not_blank');
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
      insert into support_timeouts (user_id, until, note, lifted_at, deleted_at, deleted_by, created_by, updated_by)
      values (${A.id}, now() + interval '1 day', 'Spam', null, null, null, ${ADMIN}, ${ADMIN}),
             (${B.id}, now() - interval '1 minute', 'Spam', null, null, null, ${ADMIN}, ${ADMIN}),
             (${C.id}, now() + interval '1 day', 'Spam', now(), null, null, ${ADMIN}, ${ADMIN}),
             (${D.id}, now() + interval '1 day', 'Spam', null, now(), ${ADMIN}, ${ADMIN}, ${ADMIN}),
             (${F.id}, now() + interval '1 day', 'Spam', null, null, null, ${ADMIN}, ${ADMIN})
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
