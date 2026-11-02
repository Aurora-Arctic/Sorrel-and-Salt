import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';

// A migration test, retired once `0120` is in production's journal. `0120` removes every send count written before the counts
// were keyed by an HMAC, since those rows hold the addresses themselves. The test database is already migrated, so the
// statements run again over rows the case writes.

const FILE = fromRoot('src/db/migrations/0120_support-send-counts-drop-address-keys.sql');

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

describe('0120', () => {
  it('leaves no send count that holds an address', async () => {
    const stamps = { created_by: SIGNED_OUT_SENDER_ID, updated_by: SIGNED_OUT_SENDER_ID };
    await sql`insert into support_send_counts ${sql([
      {
        kind: 'address',
        key: 'visitor@example.test',
        window_start: new Date(),
        count: 3,
        ...stamps,
      },
      { kind: 'client', key: '203.0.113.7', window_start: new Date(), count: 3, ...stamps },
    ])}`;
    // Precondition: the rows an earlier release wrote, addresses and all, are there to remove.
    expect(await sql`select key from support_send_counts`).toHaveLength(2);

    for (const statement of STATEMENTS) await sql.unsafe(statement);

    expect(await sql`select key from support_send_counts`).toEqual([]);
  });
});
