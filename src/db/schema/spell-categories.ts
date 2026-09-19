import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { categories } from './categories';
import { spells } from './spells';

// What a spell is *meant to do* (story 48) — the assigned categories, never the
// derived ones, which are the union of its ingredients' and stored nowhere.
// Hard-deleted (MB.34), no `workspace_id`, so the service scopes through the
// parent spell (claude-docs/db.md, "spell_categories").
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
    // The pair is the identity; a surrogate id would allow duplicates.
    primaryKey({ columns: [table.spellId, table.categoryId] }),
    // The other direction — the grimoire list filters by category — with
    // `spell_id` riding along.
    index('spell_categories_category_id_idx').on(table.categoryId, table.spellId),
  ],
);
