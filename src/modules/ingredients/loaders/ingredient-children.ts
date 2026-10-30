import { defineLoader } from '../../../graphql/loaders/define-loader';
import {
  categoriesOf,
  categoriesOfVariants,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  referencesOfVariants,
  substitutesOf,
  substitutesOfVariants,
  variantsOf,
} from '../services/ingredient-children';
import type { Built } from '../../../graphql/loaders/types';
import type {
  CategoryRow,
  CitedReference,
  FolkNameRow,
  IngredientDeityRow,
  IngredientKey,
  IngredientVariantRow,
  SubstituteRow,
  VariantKey,
} from '../types';

// Keyed by the parent row rather than its id, so the service knows which
// coven to check without a read of its own; cached by id, since the same
// ingredient reached through two fields is one key.
const byId = { cacheKeyFn: (ref: IngredientKey) => ref.id };
const byVariantId = { cacheKeyFn: (ref: VariantKey) => ref.id };

// Every child loader in one record rather than one export each, so
// `clearIngredientChildren` is built from it: a loader added here is cleared
// after every ingredient write without either mutation naming it.
const CHILD_LOADERS = {
  /** `Ingredient.categories`, batched: the categories of each ingredient loaded in one request. */
  categoriesByIngredient: defineLoader<IngredientKey, CategoryRow[], string>(categoriesOf, byId),

  /** `Ingredient.folkNames`, batched: the folk names of each ingredient loaded in one request. */
  folkNamesByIngredient: defineLoader<IngredientKey, FolkNameRow[], string>(folkNamesOf, byId),

  /** `Ingredient.references`, batched: the references each ingredient loaded in one request cites. */
  referencesByIngredient: defineLoader<IngredientKey, CitedReference[], string>(referencesOf, byId),

  /** `Ingredient.substitutes`, batched: the substitutes of each ingredient loaded in one request. */
  substitutesByIngredient: defineLoader<IngredientKey, SubstituteRow[], string>(
    substitutesOf,
    byId,
  ),

  /** `Ingredient.deities`, batched: the deities of each ingredient loaded in one request. */
  deitiesByIngredient: defineLoader<IngredientKey, IngredientDeityRow[], string>(deitiesOf, byId),

  /** `Ingredient.variants`, batched: the forms of each ingredient loaded in one request. */
  variantsByIngredient: defineLoader<IngredientKey, IngredientVariantRow[], string>(
    variantsOf,
    byId,
  ),
};

// A variant's child loaders, keyed by the variant row as the ingredient's are
// by the ingredient row. A record of their own: an ingredient write
// knows the ingredient, not which of its variants a request has loaded, so
// `clearIngredientChildren` empties these whole.
const VARIANT_CHILD_LOADERS = {
  /** `IngredientVariant.categories`, batched: the categories each variant adds. */
  categoriesByVariant: defineLoader<VariantKey, CategoryRow[], string>(
    categoriesOfVariants,
    byVariantId,
  ),

  /** `IngredientVariant.substitutes`, batched: what may stand in for each variant. */
  substitutesByVariant: defineLoader<VariantKey, SubstituteRow[], string>(
    substitutesOfVariants,
    byVariantId,
  ),

  /** `IngredientVariant.references`, batched: the references each variant cites. */
  referencesByVariant: defineLoader<VariantKey, CitedReference[], string>(
    referencesOfVariants,
    byVariantId,
  ),
};

// One export each, as src/graphql/loaders/index.ts registers them by name.
export const {
  categoriesByIngredient,
  folkNamesByIngredient,
  referencesByIngredient,
  substitutesByIngredient,
  deitiesByIngredient,
  variantsByIngredient,
} = CHILD_LOADERS;
export const { categoriesByVariant, substitutesByVariant, referencesByVariant } =
  VARIANT_CHILD_LOADERS;

/**
 * Clears `row` from every child loader of the request's `loaders`, and empties its variants' child loaders. An ingredient write calls it
 * before answering: root mutation fields run in turn, so an earlier one may have read this entry's children.
 */
export function clearIngredientChildren(
  loaders: Built<typeof CHILD_LOADERS & typeof VARIANT_CHILD_LOADERS>,
  row: IngredientKey,
): void {
  for (const name of Object.keys(CHILD_LOADERS) as (keyof typeof CHILD_LOADERS)[]) {
    loaders[name].clear(row);
  }
  for (const name of Object.keys(VARIANT_CHILD_LOADERS) as (keyof typeof VARIANT_CHILD_LOADERS)[]) {
    loaders[name].clearAll();
  }
}
