import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { supportReplies } from '@/modules/support/schema/support-replies';

const OWN_COLUMNS = ['id', 'request_id', 'body'];
const REQUEST_INDEX = 'support_replies_request_idx';
const AUTHOR = FIXTURE_USERS.E.id;

describe('support_replies schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(supportReplies);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('declares its index partial on deleted_at', () => {
    expect(Object.keys(byIndexName)).toEqual([REQUEST_INDEX]);
    expect(byIndexName[REQUEST_INDEX].config.where).toBeDefined();
  });

  it('has a foreign key to its request', () => {
    expect(nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)])).toEqual([
      ['request_id', 'support_requests'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

describe('support_replies table', () => {
  it('refuses a reply for no request', async () => {
    const error = await failureOf(
      sql`insert into support_replies (request_id, body, created_by, updated_by)
          values (pg_catalog.gen_random_uuid(), 'Hello', ${AUTHOR}, ${AUTHOR})`,
    );

    // 23503 is foreign_key_violation.
    expect(error.code).toBe('23503');
  });

  it('accepts a reply for a request', async () => {
    const [request] = await sql`
      insert into support_requests (kind, subject, message, path, created_by, updated_by)
      values ('question', 'Subject', 'Message', '/', ${AUTHOR}, ${AUTHOR}) returning id`;

    await expect(
      sql`insert into support_replies (request_id, body, created_by, updated_by)
          values (${request.id}, 'Hello', ${AUTHOR}, ${AUTHOR}) returning id`,
    ).resolves.toHaveLength(1);
  });
});
