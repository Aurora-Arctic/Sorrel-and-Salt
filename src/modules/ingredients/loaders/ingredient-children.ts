import { defineLoader } from '../../../graphql/loaders/define-loader';
import {
  categoriesOf,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  substitutesOf,
} from '../services/ingredient-children';
import type { Built } from '../../../graphql/loaders/types';
import type {
  CategoryRow,
  CitedReference,
  IngredientDeityRow,
  IngredientKey,
  SubstituteRow,
} from '../types';

// Keyed by the parent row rather than its id, so the service knows which
// coven to check without a read of its own; cached by id, since the same
// ingredient reached through two fields is one key.
const byId = { cacheKeyFn: (ref: IngredientKey) => ref.id };

// Every child loader in one record rather than one export each, so
// `clearIngredientChildren` is built from it: a loader added here is cleared
// after every ingredient write without either mutation naming it.
const CHILD_LOADERS = {
  /** `Ingredient.categories`, batched: the categories of each ingredient loaded in one request. */
  categoriesByIngredient: defineLoader<IngredientKey, CategoryRow[], string>(categoriesOf, byId),

  /** `Ingredient.folkNames`, batched: the folk names of each ingredient loaded in one request. */
  folkNamesByIngredient: defineLoader<IngredientKey, string[], string>(folkNamesOf, byId),

  /** `Ingredient.references`, batched: the references each ingredient loaded in one request cites. */
  referencesByIngredient: defineLoader<IngredientKey, CitedReference[], string>(referencesOf, byId),

  /** `Ingredient.substitutes`, batched: the substitutes of each ingredient loaded in one request. */
  substitutesByIngredient: defineLoader<IngredientKey, SubstituteRow[], string>(
    substitutesOf,
    byId,
  ),

  /** `Ingredient.deities`, batched: the deities of each ingredient loaded in one request. */
  deitiesByIngredient: defineLoader<IngredientKey, IngredientDeityRow[], string>(deitiesOf, byId),
};

// One export each, as src/graphql/loaders/index.ts registers them by name.
export const {
  categoriesByIngredient,
  folkNamesByIngredient,
  referencesByIngredient,
  substitutesByIngredient,
  deitiesByIngredient,
} = CHILD_LOADERS;

/**
 * Clears `row` from every child loader of the request's `loaders`. An
 * ingredient write calls it before answering: root mutation fields run in
 * turn within one request, so an earlier one may have read this entry's
 * children, and the answer must be this write's. `loaders` is typed by the
 * record, so a loader added to it and not registered with the request
 * context fails to compile at each caller.
 */
export function clearIngredientChildren(
  loaders: Built<typeof CHILD_LOADERS>,
  row: IngredientKey,
): void {
  for (const name of Object.keys(CHILD_LOADERS) as (keyof typeof CHILD_LOADERS)[]) {
    loaders[name].clear(row);
  }
}
