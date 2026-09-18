import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { categories } from './categories';
import { ingredients } from './ingredients';

// DESIGN.md §5: `ingredientId`, `categoryId`, + audit stamps, keyed on the
// pair. Story 22's table — an ingredient is protective *and* cleansing, and a
// category holds every ingredient that is.
//
// The first of MB.34's three join tables, and the first table in the schema to
// spread `...auditStampColumns` rather than `...auditColumns`: a chip toggled
// off removes the row outright. No `deleted_at`, and so no partial unique index
// either — rule 4's convention exists to stop a tombstone reserving a name
// forever, and a composite primary key has no tombstone to dodge. Re-adding a
// pair that was removed is an ordinary insert. The four stamps stay, because
// `created_by` still answers who tagged this ingredient with this category.
//
// Both sides are real foreign keys. `categories` is admin-curated and
// referenced by id, unlike `ingredients.form`'s free text — §5's rule that a
// vocabulary only an admin writes is a foreign key, and here there is no
// vocabulary question at all: the row *is* the link, so a dangling id on either
// side is a chip that renders nothing.
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
    // The identity of an assignment is the pair, exactly as on
    // `workspace_members`: a surrogate id would let the same category be
    // assigned to the same ingredient twice, and nothing downstream could tell
    // the two rows apart.
    primaryKey({ columns: [table.ingredientId, table.categoryId] }),
    // Lookup in the other direction. The primary key's index is
    // `(ingredient_id, category_id)`, which serves "what is this ingredient
    // tagged with"; "what is in this category" reads `category_id` first and
    // would otherwise scan every assignment in the database. `ingredient_id`
    // rides along so that question is answerable from the index alone, mirroring
    // what the key already does for the forward direction.
    index('ingredient_categories_category_id_idx').on(table.categoryId, table.ingredientId),
  ],
);
