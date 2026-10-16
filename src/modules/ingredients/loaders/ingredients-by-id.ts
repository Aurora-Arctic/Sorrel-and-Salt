import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { ingredientsOf } from '../services/ingredients-by-id';
import type { IngredientKey, IngredientRow } from '../types';

/**
 * An ingredient by id, batched: every ingredient a request's stock rows or
 * spell layers name, in one read, for `InventoryItem.ingredient` and
 * `SpellIngredient.ingredient`. Keyed by the row that names it, so the
 * service knows which coven to read in, and cached by the id alone. Null for
 * an id that is missing, soft-deleted or in another coven. There is no
 * variants twin: a variant is read beneath its ingredient, through
 * `variantsByIngredient`.
 */
export const ingredientsById = defineSignedInLoader<IngredientKey, IngredientRow | null, string>(
  ingredientsOf,
  { cacheKeyFn: (ref) => ref.id },
);
