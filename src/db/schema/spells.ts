import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { workspaces } from './workspaces';

// DESIGN.md §5's two v1 values. An enum rather than a text column with a CHECK
// because §13's viewer-approval workflow adds `proposed` and `approved` to this
// column in v2: `ALTER TYPE … ADD VALUE` expands, where widening a CHECK
// re-validates every existing row.
export const spellStatus = pgEnum('spell_status', ['draft', 'complete']);

// DESIGN.md §5, stories 47 and 50 — the grimoire: what a workspace *makes*, as
// against what exists (the compendium) and what it holds (`inventory_items`).
//
// **`visibility` is not here, and its absence is scheduled rather than
// forgotten.** M10.3 adds it after M1.23 has seeded spells against this shape,
// which is what makes its "existing seeded spells migrate to workspace
// visibility" criterion testable; spells-schema.test.ts asserts the column list
// exactly so adding it early cannot quietly delete that criterion
// (claude-docs/db.md, "The grimoire").
export const spells = pgTable('spells', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  // The only thing a spell must have: §8's acceptance example creates one with
  // a workspace and a title and nothing else.
  title: text('title').notNull(),
  // What the spell is *for*, in the member's own words — the sentence, not the
  // structured intent. M10.17 compares the assigned categories; nothing
  // compares this.
  intent: text('intent'),
  // The four correspondences, all free text and all member-written — §5's rule
  // that a vocabulary a member writes is text while one only an admin writes is
  // a foreign key. There is no curated list of moon phases or wax colours in
  // the design, and "a hand's width of jar" is a thing a record should be able
  // to say.
  jarSize: text('jar_size'),
  sealWaxColor: text('seal_wax_color'),
  moonPhase: text('moon_phase'),
  dayOfWeek: text('day_of_week'),
  instructions: text('instructions'),
  // The default is on the column rather than in the service, so a spell
  // written by any path is a draft until something says otherwise (M10.20).
  status: spellStatus('status').notNull().default('draft'),
  ...auditColumns,
});
