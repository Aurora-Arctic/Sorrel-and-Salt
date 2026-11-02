import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';
import { workspaces } from './workspaces';

// A coven owner's pause on one member's access to that coven, one row per pause, kept as history; `created_by` is who set it. It
// stands while it is live (not lifted, not deleted) and `until` is null or still ahead. Marked `namedWrites`: reached only through
// its set and lift.
export const workspaceMemberPauses = namedWrites(
  pgTable(
    'workspace_member_pauses',
    {
      id: idColumn(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id),
      // Goes with the user it names: a hard-deleted provisional account takes its pauses, as it takes its sessions.
      userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
      // Null for a pause with no end date.
      until: timestamp('until'),
      note: text('note'),
      message: text('message'),
      liftedAt: timestamp('lifted_at'),
      liftedBy: uuid('lifted_by').references(() => users.id),
      ...auditColumns,
    },
    (table) => [
      check(
        'workspace_member_pauses_lifted_together',
        sql`(${table.liftedAt} is null) = (${table.liftedBy} is null)`,
      ),
      // At most one live pause per member per coven. `until` passing cannot sit in the predicate, since now() is not immutable,
      // so an expired pause holds the slot until the set writer closes it.
      uniqueIndex('workspace_member_pauses_one_live')
        .on(table.workspaceId, table.userId)
        .where(sql`${table.liftedAt} is null and ${table.deletedAt} is null`),
    ],
  ),
);
