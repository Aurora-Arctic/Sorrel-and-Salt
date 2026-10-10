import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// Category groups: global, admin-curated. A table rather than an enum so an
// admin can add a ninth without DDL (MB.35). Two colours because one hex cannot
// clear 4.5:1 on both grounds; stored as hexes because a runtime group has no
// build-time Sass token; no CHECK on the contrast — the service validates,
// where it can name the ratio missed. No order column: groups list
// alphabetically (claude-docs/db/categories.md, "Categories, and the two
// group vocabularies").
// The slug is unique alone because two groups may both display "Protection".
export const categoryGroups = pgTable(
  'category_groups',
  {
    ...vocabularyColumns(),
    colorDark: text('color_dark').notNull(),
    colorLight: text('color_light').notNull(),
    ...auditColumns,
  },
  (table) => vocabularyIndexes('category_groups', table, { trigram: false }),
);

// Categories: global, admin-curated, and carrying no `workspaceId` — one
// shared vocabulary, which is what makes assigned-versus-derived comparable.
// No colour of its own; the group carries the pair. `groupId` is a real
// foreign key where `ingredients.form` is text: only an admin writes both sides.
// The slug is unique globally rather than per group: a chip filter and the
// seed's idempotency key both read the slug alone.
export const categories = pgTable(
  'categories',
  {
    ...vocabularyColumns(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => categoryGroups.id),
    ...auditColumns,
  },
  (table) => vocabularyIndexes('categories', table, { trigram: false }),
);
