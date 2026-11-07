import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../../identity/schema/users';
import { categories } from '../../vocabulary/schema/categories';
import { spells } from './spells';

// Assigned categories only; the derived ones are stored nowhere.
// Hard-deleted, no `workspace_id`, so the service scopes through the parent spell (claude-docs/db/spell-categories.md, "spell_categories").
export const spellCategories = pgTable(
  'spell_categories',
  {
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    ...auditStampColumns,
  },
  (table) => [
    primaryKey({ columns: [table.spellId, table.categoryId] }),
    // The grimoire list filters by category.
    index('spell_categories_category_id_idx').on(table.categoryId, table.spellId),
  ],
);
