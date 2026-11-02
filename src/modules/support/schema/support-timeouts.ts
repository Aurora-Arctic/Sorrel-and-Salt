import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';

// An admin's sanction on a sender, kept as history and never deleted by the app. The active one is the row with `until > now()` and `lifted_at IS NULL`;
// the admin who set it is `created_by`.
export const supportTimeouts = pgTable(
  'support_timeouts',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    until: timestamp('until').notNull(),
    note: text('note'),
    liftedAt: timestamp('lifted_at'),
    ...auditColumns,
  },
  (table) => [
    // The active-time-out read: a sender's rows not yet lifted, by end.
    index('support_timeouts_user_until_idx')
      .on(table.userId, table.until)
      .where(sql`${table.liftedAt} is null`),
  ],
);
