import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { workspaces } from './workspaces';

// An enum rather than a text CHECK: v2's approval workflow adds values, and
// `ALTER TYPE … ADD VALUE` expands where widening a CHECK re-validates every row.
export const spellStatus = pgEnum('spell_status', ['draft', 'complete']);

// An enum for the same reason, and §13's notes carry the third tier this one
// does not: `public`.
export const spellVisibility = pgEnum('spell_visibility', ['private', 'workspace']);

// The grimoire: what a workspace makes (claude-docs/db.md, "The grimoire").
export const spells = pgTable('spells', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  // The only required field: a spell is a workspace and a title.
  title: text('title').notNull(),
  // What the spell is *for*, in the member's words; nothing compares it.
  intent: text('intent'),
  // Free text, member-written: a vocabulary a member writes is text (§5).
  jarSize: text('jar_size'),
  sealWaxColor: text('seal_wax_color'),
  moonPhase: text('moon_phase'),
  dayOfWeek: text('day_of_week'),
  instructions: text('instructions'),
  // Defaulted on the column so a spell written by any path is a draft.
  status: spellStatus('status').notNull().default('draft'),
  // Defaulted on the column for the stronger version of the same reason: a
  // spell that fell back to `private` would be invisible to the coven that
  // cannot see it is missing, and widening it back is the author's alone.
  // The author is `created_by` — §5 gives spells no separate author column.
  visibility: spellVisibility('visibility').notNull().default('workspace'),
  ...auditColumns,
});
