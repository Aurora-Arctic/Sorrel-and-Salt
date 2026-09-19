import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { categories } from './categories';
import { ingredients } from './ingredients';

// DESIGN.md §5 / story 22: an ingredient is protective *and* cleansing, and a
// category holds every ingredient that is.
//
// The first of MB.34's three hard-deleted join tables — `...auditStampColumns`
// rather than `...auditColumns`, so a chip toggled off removes the row and
// there is no partial index to add (claude-docs/db.md, "Hard delete on the
// three join tables"). Both sides are real foreign keys: the row *is* the
// link, so a dangling id on either side is a chip that renders nothing.
export const ingredientCategories = pgTable(
  'ingredient_categories',
  {
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    ...auditStampColumns,
  },
  (table) => [
    // The pair is the assignment's identity — a surrogate id would let the same
    // category be assigned to the same ingredient twice.
    primaryKey({ columns: [table.ingredientId, table.categoryId] }),
    // The other direction, so "what is in this category" does not scan every
    // assignment. `ingredient_id` rides along so it is answerable from the
    // index alone.
    index('ingredient_categories_category_id_idx').on(table.categoryId, table.ingredientId),
  ],
);
