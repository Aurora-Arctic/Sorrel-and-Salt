import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// Category groups: global, admin-curated. A table rather than an enum, with two stored hex colours the service contrast-checks
// (claude-docs/db/categories.md, "Vocabulary schema details"). The slug is unique alone because two groups may both display "Protection".
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

// Categories: global, admin-curated, with no `workspaceId`, so assigned-versus-derived is comparable. The group carries the colour pair.
// The slug is unique globally rather than per group: a chip filter and the seed's idempotency key both read the slug alone.
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
