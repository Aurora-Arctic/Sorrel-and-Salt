import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { idColumn, notBlank } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';

// A keeper's sanction on a sender, kept as history and never deleted by the app. It stands while `lifted_at IS NULL` and `until`
// is null or still ahead; the keeper who set it is `created_by`.
export const supportTimeouts = pgTable(
  'support_timeouts',
  {
    id: idColumn(),
    // Null on a time-out set on a signed-out request, which binds its address alone; a claim of that address sets it.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // Null for a time-out with no end date.
    until: timestamp('until'),
    note: text('note').notNull(),
    message: text('message'),
    // The HMAC key of the address the sender wrote from (`src/lib/send-count-key.ts`), never the address, so the time-out also binds
    // a sender who writes from it again with no account; null when the sender is an account.
    addressKey: text('address_key'),
    liftedAt: timestamp('lifted_at'),
    ...auditColumns,
  },
  (table) => [
    check('support_timeouts_note_not_blank', notBlank(table.note)),
    // A time-out binds an account, an address, or both.
    check(
      'support_timeouts_binds_someone',
      sql`${table.userId} is not null or ${table.addressKey} is not null`,
    ),
    // The active-time-out read: a sender's rows not yet lifted, by end.
    index('support_timeouts_user_until_idx')
      .on(table.userId, table.until)
      .where(sql`${table.liftedAt} is null`),
    // The address check: the time-outs not lifted that bind a key.
    index('support_timeouts_address_key_idx')
      .on(table.addressKey)
      .where(sql`${table.liftedAt} is null`),
  ],
);
