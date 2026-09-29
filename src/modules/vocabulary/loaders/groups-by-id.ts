import { defineLoader } from '../../../graphql/loaders/define-loader';
import {
  type CategoryGroupRow,
  type IngredientFormGroupRow,
  categoryGroupsOf,
  formGroupsOf,
} from '../services/groups';

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
