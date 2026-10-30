import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns, users } from '../../identity/schema/users';
import { idColumn } from '../../../db/schema-parts';
import { spellWorkings } from './spell-workings';

// Who made a working: a coven member or a typed name. The rows of a working
// are replaced wholesale when its participants change, so this table has the
// four stamp columns and no `deleted_at`: a tombstone would hold only a
// position and a member for nothing (claude-docs/design-decisions/m13.4-spell-workings.md).
export const spellWorkingParticipants = pgTable(
  'spell_working_participants',
  {
    id: idColumn(),
    workingId: uuid('working_id')
      .notNull()
      .references(() => spellWorkings.id),
    // A member, or null for someone typed in by name.
    userId: uuid('user_id').references(() => users.id),
    name: text('name'),
    // The order they were entered in, stored and never inferred.
    position: integer('position').notNull(),
    ...auditStampColumns,
  },
  (table) => [
    // A member or a name, never both or neither: MB.40's one-of idiom.
    check(
      'spell_working_participants_one_identity',
      sql`num_nonnulls(${table.userId}, ${table.name}) = 1`,
    ),
    check(
      'spell_working_participants_name_not_blank',
      sql`${table.name} is null or btrim(${table.name}) <> ''`,
    ),
    // Not partial: the table has no `deleted_at` for a predicate to name.
    uniqueIndex('spell_working_participants_working_id_user_id_unique').on(
      table.workingId,
      table.userId,
    ),
    uniqueIndex('spell_working_participants_working_id_name_unique').on(
      table.workingId,
      sql`lower(${table.name})`,
    ),
  ],
);
