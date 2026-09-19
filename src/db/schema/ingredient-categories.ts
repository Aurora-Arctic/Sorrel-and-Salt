import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { categories } from './categories';
import { ingredients } from './ingredients';

// An ingredient is protective *and* cleansing (story 22). Hard-deleted
// (MB.34): `auditStampColumns`, no `deleted_at`, no partial index
// (claude-docs/db.md, "Hard delete on the three join tables").
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
    // The pair is the identity; a surrogate id would allow duplicates.
    primaryKey({ columns: [table.ingredientId, table.categoryId] }),
    // The other direction, with `ingredient_id` riding along so it is answerable
    // from the index alone.
    index('ingredient_categories_category_id_idx').on(table.categoryId, table.ingredientId),
  ],
);
