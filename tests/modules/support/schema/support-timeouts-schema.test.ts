import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
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
