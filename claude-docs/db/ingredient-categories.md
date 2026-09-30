## `ingredient_categories` (M4.4)

Story 22's table: `ingredientId`, `categoryId`, + the four audit stamps, keyed
on the pair. An ingredient carries several categories and a category holds
several ingredients, which is what makes "both protective and cleansing"
answerable.

- **The composite primary key is the assignment's identity**, as on
  `workspace_members`. There is no surrogate `id`: one would let the same
  category be assigned to the same ingredient twice, with nothing downstream
  able to tell the two rows apart. A duplicate is a `23505` naming
  `ingredient_categories_ingredient_id_category_id_pk`.
- **Both sides are foreign keys** —
  `ingredient_categories_ingredient_id_ingredients_id_fk` and
  `ingredient_categories_category_id_categories_id_fk`. A category is referenced
  by **id**, unlike `ingredients.form`'s free text: there is no vocabulary
  question here at all, since the row _is_ the link and a dangling id on either
  side is a chip that renders nothing.
- **Indexed in both directions.** The primary key's index leads on
  `ingredient_id`, which answers "what is this ingredient tagged with";
  `ingredient_categories_category_id_idx` leads on `category_id` for "what is in
  this category", which would otherwise scan every assignment in the database.
  `ingredient_id` rides along on the second so that question is answerable from
  the index alone, mirroring what the key already does for the first. It is not
  unique — uniqueness is the primary key's job, and a unique index here would
  refuse a category its second ingredient.
- **No partial index, because there is no tombstone to dodge.** The
  [partial-index convention](soft-delete.md) exists so a soft-deleted row cannot reserve its
  name forever; this table hard-deletes, so the pair is either there or it is
  not, and `WHERE deleted_at IS NULL` would not even compile against its
  columns.

Its reader is M4.8's `categoriesByIngredient` loader, through
`findManyOfIngredients` and never a generic finder (see "Ingredient children"). §12's
assigned-versus-derived distinction reads it from the derived side: a spell's
derived categories are the union of what this table holds for its ingredients.
