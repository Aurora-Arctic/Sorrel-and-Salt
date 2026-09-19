import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// Category groups: global, admin-curated. A table rather than an enum so an
// admin can add a ninth without DDL (MB.35). Two colours because one hex cannot
// clear 4.5:1 on both grounds; stored as hexes because a runtime group has no
// build-time Sass token; no CHECK — the service validates, where it can name
// the ratio missed. No order column: groups list alphabetically
// (claude-docs/db.md, "Categories, and the two group vocabularies").
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
    // Partial per CLAUDE.md rule 4, and on the slug alone: two groups may both
    // display "Protection".
    uniqueIndex('category_groups_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// Categories: global, admin-curated, and carrying no `workspaceId` — one
// shared vocabulary, which is what makes assigned-versus-derived comparable.
// No colour of its own; the group carries the pair. `groupId` is a real
// foreign key where `ingredients.form` is text: only an admin writes both sides.
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
    // Partial per rule 4, and global rather than per group: a chip filter and
    // the seed's idempotency key both read the slug alone.
    uniqueIndex('categories_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);
