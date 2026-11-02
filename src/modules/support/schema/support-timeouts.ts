import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';

// An admin's sanction on a sender, kept as history and never deleted by the app. It stands while `lifted_at IS NULL` and `until`
// is null or still ahead; the admin who set it is `created_by`.
export const supportTimeouts = pgTable(
  'support_timeouts',
  {
    id: idColumn(),
    // Goes with the sender it names: a hard-deleted provisional account takes its time-outs, as it takes its sessions.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Null for a time-out with no end date.
    until: timestamp('until'),
    // Why it was set, for staff: every time-out has one.
    note: text('note').notNull(),
    message: text('message'),
    liftedAt: timestamp('lifted_at'),
    ...auditColumns,
  },
  (table) => [
    check('support_timeouts_note_not_blank', sql`btrim(${table.note}) <> ''`),
    // The active-time-out read: a sender's rows not yet lifted, by end.
    index('support_timeouts_user_until_idx')
      .on(table.userId, table.until)
      .where(sql`${table.liftedAt} is null`),
  ],
);
