import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, revisionColumn } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';
import { idColumn } from '../../../db/schema-parts';

// An enum rather than a text CHECK: v2's approval workflow adds values, and
// `ALTER TYPE … ADD VALUE` expands where widening a CHECK re-validates every row.
export const spellStatus = pgEnum('spell_status', ['draft', 'complete']);

// An enum for the same reason, and §13's notes carry the third tier this one
// does not: `public`.
export const spellVisibility = pgEnum('spell_visibility', ['private', 'workspace']);

// Not a column: the orders a grimoire page takes (M10.9), kept here so the
// GraphQL enum and the repository read one list. Last edited first is the
// default; claude-docs/graphql/schema.md, "The grimoire", says what each does.
export const GRIMOIRE_ORDERS = ['UPDATED_DESC', 'CREATED_DESC', 'TITLE_ASC'] as const;

// The grimoire: what a workspace makes (claude-docs/db/grimoire.md, "The grimoire").
export const spells = pgTable(
  'spells',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    // Absent on a draft: autosave writes the row on the first keystroke, before
    // the member may have named it, and a placeholder would read as a real
    // title. A title is required to complete, by the CHECK below (M13.15).
    title: text('title'),
    // What the spell is *for*, in the member's words; nothing compares it.
    intent: text('intent'),
    // Free text, member-written: a vocabulary a member writes is text (§5).
    jarDescription: text('jar_description'),
    sealWaxColor: text('seal_wax_color'),
    moonPhase: text('moon_phase'),
    dayOfWeek: text('day_of_week'),
    // The old name of `note`, kept until M13.9 drops it. The saves write
    // `note` alone and leave this as it was, as DESIGN.md §5 says
    // (claude-docs/db/grimoire.md, "Steps (M13.1)").
    instructions: text('instructions'),
    // The spell's single free-text note. What to do lives in its steps
    // (`spell_steps.body`) now, not here.
    note: text('note'),
    // Defaulted on the column so a spell written by any path is a draft.
    status: spellStatus('status').notNull().default('draft'),
    // Defaulted on the column for the stronger version of the same reason: a
    // spell that fell back to `private` would be invisible to the coven that
    // cannot see it is missing, and widening it back is the author's alone.
    // The author is `created_by` — §5 gives spells no separate author column.
    visibility: spellVisibility('visibility').notNull().default('workspace'),
    // Raised by one on every UPDATE by the database; a save names it (M13.15).
    revision: revisionColumn(),
    ...auditColumns,
  },
  (table) => [
    // "A title is required to complete", said by the table, so no path writes a
    // finished spell with no name.
    check(
      'spells_complete_has_title',
      sql`${table.status} <> 'complete' OR ${table.title} IS NOT NULL`,
    ),
    // The grimoire search's fold, `unaccent_immutable($1) <% unaccent_immutable(title)`
    // and the same over intent, reaches a trigram index only through an
    // expression index over the same fold, as `ingredients_unaccent_trgm` does
    // (claude-docs/db/grimoire.md, "The grimoire search"). One index over both
    // columns serves either arm. Not partial: it reserves nothing.
    index('spells_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.title}) gin_trgm_ops`,
      sql`unaccent_immutable(${table.intent}) gin_trgm_ops`,
    ),
  ],
);
