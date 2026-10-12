import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns, users } from './users';
import { idColumn } from '../../../db/schema-parts';

// The primary admin's switch on admin grants and revokes, kept as one row per
// pause rather than a flag on a one-row settings table: a pause is opened by
// an insert, so no migration has to seed a row before any user exists to
// stamp it, and each pause keeps who began it (`created_by`) and who ended it
// (claude-docs/design-decisions/mb.62-pause-ledger.md). Marked `namedWrites`
// (MB.198): reached only through the writer's pause and resume and the
// open-pause finder.
export const adminRoleChangePauses = namedWrites(
  pgTable(
    'admin_role_change_pauses',
    {
      id: idColumn(),
      // Null while the pause holds. A pair of its own rather than the update
      // stamps, so whether a pause holds is a column, not an inference.
      endedAt: timestamp('ended_at'),
      endedBy: uuid('ended_by').references(() => users.id),
      // The full spread like every non-join table, though nothing in v1 sets the
      // delete pair: one shape for every audited table (CLAUDE.md rule 3).
      ...auditColumns,
    },
    (table) => [
      check(
        'admin_role_change_pauses_ended_together',
        sql`(${table.endedAt} is null) = (${table.endedBy} is null)`,
      ),
      // At most one open pause: a constant keys every open row alike, so a
      // second collides. Partial per rule 4 as well as on the open pause.
      uniqueIndex('admin_role_change_pauses_one_open')
        .on(sql`(true)`)
        .where(sql`${table.endedAt} is null and ${table.deletedAt} is null`),
    ],
  ),
);
