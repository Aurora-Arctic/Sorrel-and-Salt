import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { workspaces } from './workspaces';

// DESIGN.md §5: `draft | complete` in v1, and an enum rather than a text column
// with a CHECK because §13's viewer-approval workflow adds `proposed` and
// `approved` to this same column in v2 — `ALTER TYPE ... ADD VALUE` is an
// expand-only migration, where widening a CHECK is a rewrite of the constraint
// every existing row is then re-validated against.
//
// The two values are written here rather than in a shared module. M9.2's
// `src/lib/units.ts` exists because three consumers outside the database layer
// need the unit vocabulary and none of them may import a schema file; nothing
// in this task has a second consumer, and TASKS.md names the unit module as
// that milestone's one deliberate bundle rather than a pattern to copy.
export const spellStatus = pgEnum('spell_status', ['draft', 'complete']);

// DESIGN.md §5: `id`, `workspaceId`, `title`, `intent`, `jarSize`,
// `sealWaxColor`, `moonPhase`, `dayOfWeek`, `instructions`, `status`, + audit.
// Stories 47 and 50's table — the grimoire: what a workspace *makes*, as
// against what exists (the compendium) and what it holds (`inventory_items`).
//
// **`visibility` is not here, and its absence is scheduled rather than
// forgotten.** §5 lists it on this table and M10.3 adds it in Wave 5, after
// M1.23 has seeded spells against this one — which is what makes M10.3's
// criterion, "existing seeded spells migrate to workspace visibility", a thing
// that can actually be tested (TASKS.md, "Breaking the M1.23 ↔ M10.3 cycle").
// Adding the column here would quietly delete that criterion, so
// spells-schema.test.ts asserts the column list exactly.
//
// The table is inert at Wave 3. Nothing queries it until M10.5's service and
// M10.10's mutations land in Wave 13 — CLAUDE.md's table-task-then-behaviour-
// task rule, which is why the DDL can be constrained now, while the table is
// empty.
export const spells = pgTable('spells', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  // The only thing a spell must have. §8's acceptance example creates one with
  // a workspace and a title and nothing else, and M10.11's grimoire list has
  // to have something to render — everything below describes the working and
  // is answered as it is built.
  title: text('title').notNull(),
  // What the spell is *for*, in the member's own words. Not to be confused
  // with the assigned categories that also express intent (§9): those are the
  // structured, comparable form, this is the sentence. M10.17 compares the
  // categories; nothing compares this.
  intent: text('intent'),
  // The four correspondences, all free text and all member-written — §5's rule
  // that a vocabulary a member writes is text while one only an admin writes
  // is a foreign key. There is no curated list of moon phases or wax colours
  // anywhere in the design, and inventing one here would be a vocabulary the
  // design doc does not name: "4 oz", "a hand's width of jar", "the first
  // Saturday after" are all things a jar's record should be able to say.
  jarSize: text('jar_size'),
  sealWaxColor: text('seal_wax_color'),
  moonPhase: text('moon_phase'),
  dayOfWeek: text('day_of_week'),
  instructions: text('instructions'),
  // M10.20: "New spells default to draft". The default is on the column rather
  // than in the service, so a spell written by any path is a draft until
  // something explicitly says otherwise — an unfinished spell mistaken for a
  // finished one is the failure story 55 names, and a default that lives in one
  // code path is a default the next code path forgets.
  status: spellStatus('status').notNull().default('draft'),
  ...auditColumns,
});
