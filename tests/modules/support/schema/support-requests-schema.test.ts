import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { supportRequests } from '@/modules/support/schema/support-requests';

// A message an account sends to whoever runs the site; the sender is `created_by`.

const OWN_COLUMNS = [
  'id',
  'kind',
  'subject',
  'message',
  'path',
  'error_code',
  'status',
  'assigned_to',
  'curator_visible',
  'issue_url',
  'resolved_by',
  'resolved_at',
];

const LIST_INDEX = 'support_requests_status_created_idx';
const SENDER = FIXTURE_USERS.A.id;

describe('support_requests schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(supportRequests);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('carries no workspace id', () => {
    expect(byName).not.toHaveProperty('workspace_id');
  });

  it('declares one index, partial on deleted_at and not unique', () => {
    expect(Object.keys(byIndexName)).toEqual([LIST_INDEX]);
    expect(byIndexName[LIST_INDEX].config.unique).toBe(false);
    expect(byIndexName[LIST_INDEX].config.where).toBeDefined();
  });

  it('has foreign keys to the three accounts a request names', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)]).sort(),
    ).toEqual([
      ['assigned_to', 'users'],
      ['resolved_by', 'users'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function insert(fields: { kind?: string; status?: string } = {}) {
  const kind = fields.kind ?? 'question';
  const [row] = fields.status
    ? await sql`
        insert into support_requests (kind, subject, message, path, status, created_by, updated_by)
        values (${kind}::support_request_kind, 'Subject', 'Message', '/', ${fields.status}::support_request_status, ${SENDER}, ${SENDER})
        returning *`
    : await sql`
        insert into support_requests (kind, subject, message, path, created_by, updated_by)
        values (${kind}::support_request_kind, 'Subject', 'Message', '/', ${SENDER}, ${SENDER})
        returning *`;
  return row;
}

describe('support_requests table', () => {
  it('defaults to open, hidden from curators, with nothing assigned or resolved', async () => {
    const row = await insert();

    expect(row.status).toBe('open');
    expect(row.curator_visible).toBe(false);
    expect(row.error_code).toBeNull();
    expect(row.assigned_to).toBeNull();
    expect(row.issue_url).toBeNull();
    expect(row.resolved_by).toBeNull();
    expect(row.resolved_at).toBeNull();
  });

  it.each(['accessibility', 'bug', 'question'])('accepts the kind %s', async (kind) => {
    await expect(insert({ kind })).resolves.toBeDefined();
  });

  it('refuses a kind outside its enum', async () => {
    const error = await failureOf(insert({ kind: 'complaint' }));

    // 22P02 is invalid_text_representation, which is what an enum refuses with.
    expect(error.code).toBe('22P02');
  });

  it('refuses a status outside its enum', async () => {
    const error = await failureOf(insert({ status: 'closed' }));

    expect(error.code).toBe('22P02');
  });

  it('accepts the status resolved', async () => {
    await expect(insert({ status: 'resolved' })).resolves.toBeDefined();
  });
});
