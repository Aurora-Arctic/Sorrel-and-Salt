import { definePublicLoader } from '../../../graphql/loaders/define-loader';
import { formChoicesOf } from '../services/curated-values';
import { categoryGroupsOf, deityTraditionsOf, formGroupsOf } from '../services/groups';
import type {
  CategoryGroupRow,
  DeityTraditionRow,
  IngredientFormGroupRow,
  IngredientFormValueRow,
} from '../types';

// Keyed by id and answered for anyone: the groups are public reference data,
// and the services take no session.

/** `Category.group`, batched: the group of every category loaded in one request. */
export const categoryGroupsById = definePublicLoader<string, CategoryGroupRow>(categoryGroupsOf);

/** `IngredientFormValue.group`, batched the same way. */
export const ingredientFormGroupsById = definePublicLoader<string, IngredientFormGroupRow>(
  formGroupsOf,
);

/** `Deity.tradition`, batched the same way. */
export const deityTraditionsById = definePublicLoader<string, DeityTraditionRow>(deityTraditionsOf);

/**
 * `Ingredient.formChoice`, batched: the curated form behind each pick on a
 * page, null for one no longer curated (MB.167).
 */
export const ingredientFormsById = definePublicLoader<string, IngredientFormValueRow | null>(
  formChoicesOf,
);
