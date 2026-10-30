import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import type { Built } from '../../../graphql/loaders/types';
import { stockOf } from '../services/stock';
import type { StockKey, StockRow } from '../types';

/**
 * A coven's jars of an ingredient, batched per coven, for `Ingredient.stock`. Keyed by ingredient and coven.
 * A write clears its key, so a later read in the same request sees it.
 */
export const stockByIngredient = defineSignedInLoader<StockKey, StockRow[], string>(stockOf, {
  cacheKeyFn: (key) => `${key.workspaceId}:${key.ingredientId}`,
});

/**
 * Drops the request's cached jars of `row`'s ingredient in its coven, so a
 * later read in the same request sees the write that answered `row`.
 */
export function clearStock(
  loaders: Built<{ stockByIngredient: typeof stockByIngredient }>,
  row: Pick<StockRow, 'ingredientId' | 'workspaceId'>,
): void {
  loaders.stockByIngredient.clear({ ingredientId: row.ingredientId, workspaceId: row.workspaceId });
}
