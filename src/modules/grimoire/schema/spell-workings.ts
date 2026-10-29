import { sql } from 'drizzle-orm';
import { check, date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { idColumn } from '../../../db/schema-parts';
import { spells, spellVisibility } from './spells';

// An enum rather than a text CHECK, for the reason `spell_status` is one: a
// later value expands with `ALTER TYPE … ADD VALUE`. A separate enum from
// `spell_status`, because the two lifecycles are not the same thing even
// while their values match today.
export const workingStatus = pgEnum('working_status', ['draft', 'complete']);

// One time a spell was made: when, and with whom. The spell is the recipe
// and a working is the record of making it once (claude-docs/design-decisions/m13.4-spell-workings.md).
// Soft-deleted, because a person may delete a working they recorded. It
// carries no `workspace_id`: the service reaches it through its parent spell,
// as `spell_steps` is reached, so a working of a deleted spell is unreachable
// by the spell's own filter, not by a cascade.
export const spellWorkings = pgTable(
  'spell_workings',
  {
    id: idColumn(),
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    // Defaulted on the column so a working written by any path is a draft.
    status: workingStatus('status').notNull().default('draft'),
    // The day it was made, a date and not a timestamp: nobody records the
    // minute, and a timestamp would drag a time zone into "when".
    workedOn: date('worked_on').notNull(),
    // Null while a draft. A moment, because completion is an event.
    completedAt: timestamp('completed_at', { withTimezone: true }),
    note: text('note'),
    // The same enum a spell uses; defaulted for the same reason, and a working's
    // author is `created_by`.
    visibility: spellVisibility('visibility').notNull().default('workspace'),
    ...auditColumns,
  },
  (table) => [
    // The recipe page reads a spell's workings newest first.
    index('spell_workings_spell_id_worked_on_idx')
      .on(table.spellId, sql`${table.workedOn} desc`)
      .where(sql`${table.deletedAt} is null`),
    // A blank note would say nothing.
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
