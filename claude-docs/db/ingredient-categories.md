## `ingredient_categories` (M4.4)

Story 22's table: `ingredientId`, `categoryId`, + the four audit stamps, keyed
on the pair. An ingredient carries several categories and a category holds
several ingredients, which is what makes "both protective and cleansing"
answerable.

- **The pair is the assignment's identity**, as on `workspace_members`.
  There is no surrogate `id`: one would let the same category be assigned to
  the same ingredient twice, with nothing downstream able to tell the two rows
  apart. Since MB.217 a pair may file one form instead, through a nullable
  `variant_id`, so the composite primary key became two unique indexes: a
  duplicate on the ingredient itself is a `23505` naming
  `ingredient_categories_ingredient_category_unique`, on
  `(ingredient_id, category_id) WHERE variant_id IS NULL`, and on a form one
  naming `ingredient_categories_variant_category_unique`, on
  `(variant_id, category_id) WHERE variant_id IS NOT NULL`. A form's pair still
  carries its `ingredient_id`, held to the variant's own by the composite key
  `ingredient_categories_variant_fk`, so a category filter on
  `ingredient_id` reads the ingredient's pairs and its forms' alike.
- **Both sides are foreign keys** —
  `ingredient_categories_ingredient_id_ingredients_id_fk` and
  `ingredient_categories_category_id_categories_id_fk`. A category is referenced
  by **id**, unlike `ingredients.form`'s free text: there is no vocabulary
  question here at all, since the row _is_ the link and a dangling id on either
  side is a chip that renders nothing.
- **Indexed in both directions.** The parent pair's unique index leads on
  `ingredient_id`, which answers "what is this ingredient tagged with";
  `ingredient_categories_category_id_idx` leads on `category_id` for "what is in
  this category", which would otherwise scan every assignment in the database.
  `ingredient_id` rides along on the second so that question is answerable from
  the index alone, mirroring what the pair's index already does for the first. It is not
  unique — uniqueness is the pair indexes' job, and a unique index here would
  refuse a category its second ingredient.
- **No `deleted_at` predicate, because there is no tombstone to dodge.** The
  [partial-index convention](soft-delete.md) exists so a soft-deleted row cannot reserve its
  name forever; this table hard-deletes, so the pair is either there or it is
  not, and `WHERE deleted_at IS NULL` would not even compile against its
  columns. The two pair indexes are partial on `variant_id` instead, which
  `tests/db/partial-unique-indexes.test.ts` sweeps by deleting the holder
  outright. `write.delete` names the parent's own pair with `variantId: null`.

Its reader is M4.8's `categoriesByIngredient` loader, through
`findManyOfIngredients` and never a generic finder
(see ["Ingredient children"](ingredient-children.md)). §12's
assigned-versus-derived distinction reads it from the derived side: a spell's
derived categories are the union of what this table holds for its ingredients.
