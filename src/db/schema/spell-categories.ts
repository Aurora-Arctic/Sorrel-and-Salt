import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { categories } from './categories';
import { spells } from './spells';

// DESIGN.md §5 / story 48: what a spell is *meant to do*, recorded alongside
// what is actually in the jar.
//
// **These are the assigned categories, not the derived ones** (§9, §12), and
// conflating the two is a bug. A spell's derived categories are the union of
// its ingredients', read through `ingredient_categories` and stored nowhere.
//
// The last of MB.34's three hard-deleted join tables — `...auditStampColumns`
// rather than `...auditColumns`, so a chip toggled off removes the row and
// there is no partial index to add. No `workspace_id` either, so M10.3's
// service scopes through the parent spell (claude-docs/db.md,
// "spell_categories").
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
    // The pair is the assignment's identity — a surrogate id would let the same
    // category be assigned to the same spell twice.
    primaryKey({ columns: [table.spellId, table.categoryId] }),
    // The other direction, which unlike `spell_ingredients` has a v1 reader:
    // M10.11 filters the grimoire list by category. `spell_id` rides along so
    // it is answerable from the index alone.
    index('spell_categories_category_id_idx').on(table.categoryId, table.spellId),
  ],
);
