import { defineLoader } from '../../../graphql/loaders/define-loader';
import { categoriesOf, folkNamesOf, substitutesOf } from '../services/ingredient-children';
import type { CategoryRow, IngredientKey, SubstituteRow } from '../types';

// Keyed by the parent row rather than its id, so the service knows which
// coven to check without a read of its own; cached by id, since the same
// ingredient reached through two fields is one key.
const byId = { cacheKeyFn: (ref: IngredientKey) => ref.id };

/** `Ingredient.categories`, batched: the categories of each ingredient loaded in one request. */
export const categoriesByIngredient = defineLoader<IngredientKey, CategoryRow[], string>(
  categoriesOf,
  byId,
);

/** `Ingredient.folkNames`, batched: the folk names of each ingredient loaded in one request. */
export const folkNamesByIngredient = defineLoader<IngredientKey, string[], string>(
  folkNamesOf,
  byId,
);

/** `Ingredient.substitutes`, batched: the substitutes of each ingredient loaded in one request. */
export const substitutesByIngredient = defineLoader<IngredientKey, SubstituteRow[], string>(
  substitutesOf,
  byId,
);
