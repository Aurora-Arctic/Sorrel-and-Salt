import { defineLoader } from '../../../graphql/loaders/define-loader';
import { formChoicesOf } from '../services/curated-values';
import { categoryGroupsOf, deityTraditionsOf, formGroupsOf } from '../services/groups';
import type {
  CategoryGroupRow,
  DeityTraditionRow,
  IngredientFormGroupRow,
  IngredientFormValueRow,
} from '../types';

// Keyed by id and answered for anyone: the groups are public reference data,
// so the request's session is taken and ignored, as the services take none.

/** `Category.group`, batched: the group of every category loaded in one request. */
export const categoryGroupsById = defineLoader<string, CategoryGroupRow>((_session, ids) =>
  categoryGroupsOf(ids),
);

/** `IngredientFormValue.group`, batched the same way. */
export const ingredientFormGroupsById = defineLoader<string, IngredientFormGroupRow>(
  (_session, ids) => formGroupsOf(ids),
);

/** `Deity.tradition`, batched the same way. */
export const deityTraditionsById = defineLoader<string, DeityTraditionRow>((_session, ids) =>
  deityTraditionsOf(ids),
);

/**
 * `Ingredient.formChoice`, batched: the curated form behind each pick on a
 * page, null for one no longer curated (MB.167).
 */
export const ingredientFormsById = defineLoader<string, IngredientFormValueRow | null>(
  (_session, ids) => formChoicesOf(ids),
);
