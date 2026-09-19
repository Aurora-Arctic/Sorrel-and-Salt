import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// DESIGN.md §5: `id`, `name`, `slug`, `colorDark`, `colorLight`,
// `description`, + audit. Global only and admin-curated, managed at
// `/admin/category-groups`.
//
// A table rather than the `category_group` pgEnum M4.2 first shipped, which
// was the right call for the closed set of eight §6 described and the wrong
// one the moment an admin may add a ninth: `ALTER TYPE … ADD VALUE` is DDL,
// migrations here are forward-only and CI-gated, and an admin mutation cannot
// run DDL at all (MB.35). §6's eight are now a starting set, seeded by M4.3.
//
// Two colours rather than one because the grounds differ: M0.7 already tunes
// every group separately per theme, and one hex cannot clear 4.5:1 on both
// soot and parchment without being mud on at least one. They are stored as
// hexes on the row rather than looked up from a build-time Sass token because
// a group created at runtime cannot have one — that is the whole point of the
// change. Neither carries a CHECK: validating each against its own theme's
// ground is M5.6b's job in the service, where the failure can name the column
// and the ratio it missed (§5, M5.6b).
//
// No order column, deliberately: groups render alphabetically by `name`, so
// there is nothing to maintain and an admin-added group lands where a reader
// would look for it rather than at the end.
export const categoryGroups = pgTable(
  'category_groups',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    colorDark: text('color_dark').notNull(),
    colorLight: text('color_light').notNull(),
    description: text('description').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4: a plain unique constraint would let a
    // soft-deleted group reserve its slug forever. Uniqueness is on the slug
    // alone, never on the display name — two groups may both want to be
    // called "Protection", and the slug is what tells them apart.
    uniqueIndex('category_groups_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// DESIGN.md §5: `id`, `name`, `slug`, `description`, `groupId`, + audit.
// Global only and admin-curated — there is deliberately no `workspaceId`
// here, and that absence is the table's whole scoping story. Categories are
// one shared vocabulary: a workspace-scoped category could not be compared
// against another workspace's, and §12's assigned-versus-derived comparison
// is only meaningful because both sides draw from the same set. User
// suggestions are v2.
//
// No colour of its own. MB.35 moved the chip colour onto the group, as a pair
// of hexes one per theme, and a category wears its group's — a single `color`
// column here could hold neither half of that pair, and §6's 63 categories
// are grouped precisely so they read as eight families rather than 63
// individually-tinted chips. §5, §6 and db.md listed `color` on this table
// until this task; the decision is recorded in §14.
//
// `groupId` is a real foreign key, unlike `ingredients.form`, and the
// asymmetry is deliberate: a vocabulary a *member* writes is text, so
// `rhizome` stays writable before anyone has curated it, where a vocabulary
// only an *admin* writes can be a foreign key because the same admin writes
// both sides and nobody is blocked by a group that does not exist yet (§5).
// The integrity is worth having — a typo'd group silently empties a chip
// section, where a foreign key refuses the row.
export const categories = pgTable(
  'categories',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => categoryGroups.id),
    ...auditColumns,
  },
  (table) => [
    // Partial per rule 4, as above — and global rather than per group: the
    // slug is what a chip filter and M4.3's idempotency key both read, and
    // neither carries a group alongside it.
    uniqueIndex('categories_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);
