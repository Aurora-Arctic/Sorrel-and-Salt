import { defineLoader } from '../../../graphql/loaders/define-loader';
import {
  type CategoryRow,
  type IngredientRef,
  categoriesOf,
  folkNamesOf,
} from '../services/ingredient-children';

// Keyed by the parent row rather than its id, so the service knows which
// coven to check without a read of its own; cached by id, since the same
// ingredient reached through two fields is one key.
const byId = { cacheKeyFn: (ref: IngredientRef) => ref.id };

/** `Ingredient.categories`, batched: the categories of each ingredient loaded in one request. */
export const categoriesByIngredient = defineLoader<IngredientRef, CategoryRow[], string>(
  categoriesOf,
  byId,
);

/** `Ingredient.folkNames`, batched: the folk names of each ingredient loaded in one request. */
export const folkNamesByIngredient = defineLoader<IngredientRef, string[], string>(
  folkNamesOf,
  byId,
);
