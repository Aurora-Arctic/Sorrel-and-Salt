import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { workspaces } from './workspaces';

// An enum rather than a text CHECK: v2's approval workflow adds values, and
// `ALTER TYPE … ADD VALUE` expands where widening a CHECK re-validates every row.
export const spellStatus = pgEnum('spell_status', ['draft', 'complete']);

// The grimoire: what a workspace makes. `visibility` is absent here on
// purpose — it is added after the demo seed exists so its migration criterion
// is testable, and spells-schema.test.ts pins the column list
// (claude-docs/db.md, "The grimoire").
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
  ...auditColumns,
});
