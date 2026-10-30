import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { ingredientsOf } from '../services/ingredients-by-id';
import type { IngredientKey, IngredientRow } from '../types';

/**
 * An ingredient by id, batched, for `InventoryItem.ingredient` and `SpellIngredient.ingredient`. Keyed by the naming row so the service
 * knows which coven to read in; null for an id missing, soft-deleted or in another coven. A variant is read beneath its ingredient.
 */
export const ingredientsById = defineSignedInLoader<IngredientKey, IngredientRow | null, string>(
  ingredientsOf,
  { cacheKeyFn: (ref) => ref.id },
);
