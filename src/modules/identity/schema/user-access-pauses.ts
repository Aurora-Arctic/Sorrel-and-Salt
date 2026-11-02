import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns, users } from './users';

// A site admin's pause on a user's access, one row per pause, kept as history; `created_by` is who set it. It stands while it is
// live (not lifted, not deleted) and `until` is null or still ahead. Marked `namedWrites`: reached only through its set and lift.
export const userAccessPauses = namedWrites(
  pgTable(
    'user_access_pauses',
    {
      id: idColumn(),
      userId: uuid('user_id')
        .notNull()
        .references(() => users.id),
      // Null for a pause with no end date.
      until: timestamp('until'),
      note: text('note'),
      liftedAt: timestamp('lifted_at'),
      liftedBy: uuid('lifted_by').references(() => users.id),
      ...auditColumns,
    },
    (table) => [
      check(
        'user_access_pauses_lifted_together',
        sql`(${table.liftedAt} is null) = (${table.liftedBy} is null)`,
      ),
      // At most one live pause per user. `until` passing cannot sit in the predicate, since now() is not immutable, so an
      // expired pause holds the slot until the set writer closes it.
      uniqueIndex('user_access_pauses_one_live')
        .on(table.userId)
        .where(sql`${table.liftedAt} is null and ${table.deletedAt} is null`),
    ],
  ),
);
