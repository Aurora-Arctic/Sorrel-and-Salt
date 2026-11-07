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

// The orders a grimoire page takes, kept here so the GraphQL enum and the repository read one list (claude-docs/graphql/schema.md, "The grimoire").
export const GRIMOIRE_ORDERS = ['UPDATED_DESC', 'CREATED_DESC', 'TITLE_ASC'] as const;

// The grimoire: what a workspace makes (claude-docs/db/grimoire.md, "The tables").
export const spells = pgTable(
  'spells',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    // Absent on a draft: autosave writes the row on the first keystroke, before the member may have named it, and a placeholder would
    // read as a real title.
    title: text('title'),
    intent: text('intent'),
    jarDescription: text('jar_description'),
    sealWaxColor: text('seal_wax_color'),
    moonPhase: text('moon_phase'),
    dayOfWeek: text('day_of_week'),
    // What to do lives in `spell_steps.body`, not here.
    note: text('note'),
    // Defaulted on the column so a spell written by any path is a draft.
    status: spellStatus('status').notNull().default('draft'),
    // Defaulted on the column, as a spell that fell back to `private` would be invisible to the coven, and widening it back is the
    // author's alone. The author is `created_by`; spells have no author column.
    visibility: spellVisibility('visibility').notNull().default('workspace'),
    revision: revisionColumn(),
    ...auditColumns,
  },
  (table) => [
    check(
      'spells_complete_has_title',
      sql`${table.status} <> 'complete' OR ${table.title} IS NOT NULL`,
    ),
    // The grimoire search's fold reaches a trigram index only through an expression index over the same fold, as
    // `ingredients_unaccent_trgm` does (claude-docs/db/grimoire.md, "The grimoire search"). Not partial: it reserves nothing.
    index('spells_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.title}) gin_trgm_ops`,
      sql`unaccent_immutable(${table.intent}) gin_trgm_ops`,
    ),
  ],
);
