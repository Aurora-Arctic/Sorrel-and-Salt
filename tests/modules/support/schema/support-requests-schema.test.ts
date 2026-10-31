import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { SUPPORT_ABOUTS } from '@/lib/support-path';
import { supportRequests } from '@/modules/support/schema/support-requests';

// A message an account sends to whoever runs the site; the sender is `created_by`.

const OWN_COLUMNS = [
  'id',
  'about',
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
  'last_sender_activity_at',
  'last_staff_activity_at',
  'closed_at',
  'linked_from',
  'error_reference',
];

const LIST_INDEX = 'support_requests_status_created_idx';
const ACTIVITY_INDEX = 'support_requests_status_sender_activity_idx';
const CLOSED_INDEX = 'support_requests_closed_at_idx';
const SENDER = FIXTURE_USERS.A.id;

describe('support_requests schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(supportRequests);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('carries no workspace id', () => {
    expect(byName).not.toHaveProperty('workspace_id');
  });

  it('declares its three indexes, the first two partial on deleted_at and none unique', () => {
    expect(Object.keys(byIndexName).sort()).toEqual([CLOSED_INDEX, LIST_INDEX, ACTIVITY_INDEX]);
    for (const name of [LIST_INDEX, ACTIVITY_INDEX]) {
      expect(byIndexName[name].config.unique).toBe(false);
      expect(byIndexName[name].config.where).toBeDefined();
    }
    expect(byIndexName[CLOSED_INDEX].config.unique).toBe(false);
  });

  it('has foreign keys to the three accounts a request names', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)]).sort(),
    ).toEqual([
      ['assigned_to', 'users'],
      ['linked_from', 'support_requests'],
      ['resolved_by', 'users'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function insert(fields: { about?: string; status?: string } = {}) {
  const about = fields.about ?? 'question';
  const [row] = fields.status
    ? await sql`
        insert into support_requests (about, subject, message, path, status, created_by, updated_by)
        values (${about}::support_request_about, 'Subject', 'Message', '/', ${fields.status}::support_request_status, ${SENDER}, ${SENDER})
        returning *`
    : await sql`
        insert into support_requests (about, subject, message, path, created_by, updated_by)
        values (${about}::support_request_about, 'Subject', 'Message', '/', ${SENDER}, ${SENDER})
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

  it.each(SUPPORT_ABOUTS.map((about) => about.value))('accepts the about %s', async (about) => {
    await expect(insert({ about })).resolves.toBeDefined();
  });

  it('refuses an about outside its enum', async () => {
    const error = await failureOf(insert({ about: 'complaint' }));

    // 22P02 is invalid_text_representation, which is what an enum refuses with.
    expect(error.code).toBe('22P02');
  });

  it('refuses a status outside its enum', async () => {
    const error = await failureOf(insert({ status: 'archived' }));

    expect(error.code).toBe('22P02');
  });

  it.each(['open', 'waiting_on_sender', 'resolved', 'closed'])(
    'accepts the status %s',
    async (status) => {
      await expect(insert({ status })).resolves.toBeDefined();
    },
  );

  it('starts with no lifecycle stamps, reference or link', async () => {
    const row = await insert();

    expect(row.last_sender_activity_at).toBeNull();
    expect(row.last_staff_activity_at).toBeNull();
    expect(row.closed_at).toBeNull();
    expect(row.linked_from).toBeNull();
    expect(row.error_reference).toBeNull();
  });

  it('stores an error reference as given', async () => {
    const [row] = await sql`
      insert into support_requests (about, subject, message, path, error_reference, created_by, updated_by)
      values ('bug', 'Subject', 'Message', '/', '1234567890', ${SENDER}, ${SENDER}) returning error_reference`;

    expect(row.error_reference).toBe('1234567890');
  });

  it('links to an existing request and refuses one that does not exist', async () => {
    const first = await insert({ status: 'closed' });
    await expect(
      sql`insert into support_requests (about, subject, message, path, linked_from, created_by, updated_by)
          values ('bug', 'Subject', 'Message', '/', ${first.id}, ${SENDER}, ${SENDER}) returning id`,
    ).resolves.toHaveLength(1);

    const error = await failureOf(
      sql`insert into support_requests (about, subject, message, path, linked_from, created_by, updated_by)
          values ('bug', 'Subject', 'Message', '/', pg_catalog.gen_random_uuid(), ${SENDER}, ${SENDER})`,
    );

    // 23503 is foreign_key_violation.
    expect(error.code).toBe('23503');
  });
});
