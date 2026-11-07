import { sql } from 'drizzle-orm';
import { check, date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { idColumn } from '../../../db/schema-parts';
import { spells, spellVisibility } from './spells';

// An enum, as `spell_status` is, so a later value expands with `ALTER TYPE … ADD VALUE`; separate from it because the two
// lifecycles are not the same thing.
export const workingStatus = pgEnum('working_status', ['draft', 'complete']);

// No `workspace_id`: the service reaches it through its parent spell, so a working of a deleted spell is unreachable by the spell's
// own filter, not by a cascade (claude-docs/design-decisions/m13.4-spell-workings.md).
export const spellWorkings = pgTable(
  'spell_workings',
  {
    id: idColumn(),
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    // Defaulted on the column so a working written by any path is a draft.
    status: workingStatus('status').notNull().default('draft'),
    // A date, not a timestamp: a timestamp would drag a time zone into "when".
    workedOn: date('worked_on').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    note: text('note'),
    // Defaulted for the same reason; a working's author is `created_by`.
    visibility: spellVisibility('visibility').notNull().default('workspace'),
    ...auditColumns,
  },
  (table) => [
    index('spell_workings_spell_id_worked_on_idx')
      .on(table.spellId, sql`${table.workedOn} desc`)
      .where(sql`${table.deletedAt} is null`),
    check(
      'spell_workings_note_not_blank',
      sql`${table.note} is null or btrim(${table.note}) <> ''`,
    ),
    // A draft has no completion moment and a complete working has one.
    check(
      'spell_workings_completed_at_with_status',
      sql`(${table.status} = 'complete') = (${table.completedAt} is not null)`,
    ),
  ],
);
