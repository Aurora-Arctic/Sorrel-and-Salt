import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// DESIGN.md §5's category groups: global, admin-curated at
// `/admin/category-groups`. A table rather than the `category_group` pgEnum
// M4.2 first shipped — right for a closed set of eight, wrong the moment an
// admin may add a ninth, since `ALTER TYPE … ADD VALUE` is DDL and an admin
// mutation cannot run DDL at all (MB.35). §6's eight are a starting set.
//
// Two colours rather than one because the grounds differ: one hex cannot clear
// 4.5:1 on both soot and parchment without being mud on at least one. Stored as
// hexes on the row rather than looked up from a Sass token because a group
// created at runtime cannot have a build-time one. Neither carries a CHECK —
// M5.6b validates each in the service, where the failure can name the column
// and the ratio it missed.
//
// No order column: groups render alphabetically by `name`.
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

// DESIGN.md §5's categories: global, admin-curated, and deliberately carrying
// no `workspaceId`. That absence is the table's whole scoping story —
// categories are one shared vocabulary, and §12's assigned-versus-derived
// comparison is only meaningful because both sides draw from the same set.
// User suggestions are v2.
//
// No colour of its own: MB.35 moved the chip colour onto the group as a pair
// of hexes, and a single `color` column here could hold neither half.
//
// `groupId` is a real foreign key, unlike `ingredients.form`, and the
// asymmetry is §5's: a vocabulary a *member* writes is text, one only an
// *admin* writes can be a foreign key because the same admin writes both sides.
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
