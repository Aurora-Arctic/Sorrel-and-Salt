import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { cupboardEntriesOf } from '../services/cupboard-entries';
import type { Built } from '../../../graphql/loaders/types';
import type { WorkspaceIngredientKey, CupboardEntryRow } from '../types';

/** A coven's cupboard entry for each compendium entry a page lists, batched per coven. Keyed by ingredient and coven, as one entry can be asked about in two. */
export const cupboardEntryByIngredient = defineSignedInLoader<
  WorkspaceIngredientKey,
  CupboardEntryRow | null,
  string
>(cupboardEntriesOf, {
  cacheKeyFn: (key) => `${key.workspaceId}:${key.ingredientId}`,
});

/**
 * Drops the request's cached cupboard entry of this compendium entry in this
 * coven, so a later read in the same request sees the write that changed it.
 */
export function clearCupboardEntry(
  loaders: Built<{ cupboardEntryByIngredient: typeof cupboardEntryByIngredient }>,
  key: WorkspaceIngredientKey,
): void {
  loaders.cupboardEntryByIngredient.clear(key);
}
