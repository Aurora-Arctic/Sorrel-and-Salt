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

export const categoryGroupsById = definePublicLoader<string, CategoryGroupRow>(categoryGroupsOf);

export const ingredientFormGroupsById = definePublicLoader<string, IngredientFormGroupRow>(
  formGroupsOf,
);

export const deityTraditionsById = definePublicLoader<string, DeityTraditionRow>(deityTraditionsOf);

/**
 * `IngredientVariant.formChoice`, batched: the curated form behind each pick on a
 * page, null for one no longer curated.
 */
export const ingredientFormsById = definePublicLoader<string, IngredientFormValueRow | null>(
  formChoicesOf,
);
