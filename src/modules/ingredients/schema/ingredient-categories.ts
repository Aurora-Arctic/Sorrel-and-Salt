import { sql } from 'drizzle-orm';
import { foreignKey, index, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../../identity/schema/users';
import { categories } from '../../vocabulary/schema/categories';
import { ingredients } from './ingredients';
import { ingredientVariants } from './ingredient-variants';

// An ingredient is protective *and* cleansing. Hard-deleted:
// `auditStampColumns`, no `deleted_at`, no partial index
// (claude-docs/db/hard-delete-join-tables.md, "Hard delete on two join tables").
export const ingredientCategories = pgTable(
  'ingredient_categories',
  {
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // Set when the pair files one form of the ingredient rather than the
    // ingredient itself; the ingredient rides along either way, so a
    // category filter on `ingredient_id` reads the union.
    variantId: uuid('variant_id'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    ...auditStampColumns,
  },
  (table) => [
    // The pair is the identity, on the parent or on one form; a surrogate id
    // would allow duplicates. Two unique indexes rather than a primary key,
    // since a key's columns cannot be null. Partial on the variant, not on a
    // tombstone: the table is hard-deleted.
    uniqueIndex('ingredient_categories_ingredient_category_unique')
      .on(table.ingredientId, table.categoryId)
      .where(sql`${table.variantId} is null`),
    uniqueIndex('ingredient_categories_variant_category_unique')
      .on(table.variantId, table.categoryId)
      .where(sql`${table.variantId} is not null`),
    foreignKey({
      name: 'ingredient_categories_variant_fk',
      columns: [table.variantId, table.ingredientId],
      foreignColumns: [ingredientVariants.id, ingredientVariants.ingredientId],
    }),
    // The other direction, with `ingredient_id` riding along so it is answerable
    // from the index alone.
    index('ingredient_categories_category_id_idx').on(table.categoryId, table.ingredientId),
  ],
);
