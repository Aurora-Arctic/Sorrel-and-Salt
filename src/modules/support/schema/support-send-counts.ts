import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';

// How many requests a signed-out visitor has sent in the current window, per email address and per client address. Written as
// the seeded signed-out sender, since a visitor has no session. A row is the count for one key; the window restarts when the
// next send finds `window_start` older than the window.
export const supportSendCounts = pgTable(
  'support_send_counts',
  {
    id: idColumn(),
    // Which kind of key `key` is: an email address or a client address.
    kind: text('kind').notNull(),
    key: text('key').notNull(),
    windowStart: timestamp('window_start').notNull(),
    count: integer('count').notNull(),
    ...auditColumns,
  },
  (table) => [
    check('support_send_counts_kind', sql`${table.kind} in ('address', 'client')`),
    uniqueIndex('support_send_counts_key_idx')
      .on(table.kind, table.key)
      .where(sql`${table.deletedAt} is null`),
  ],
);
