import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { cupboardEntriesOf } from '../services/cupboard-entries';
import type { CupboardEntryKey, CupboardEntryRow } from '../types';

/**
 * A coven's cupboard entry for each compendium entry a page lists, batched:
 * one read per coven named, for `Ingredient.cupboardEntry`. Keyed by the
 * ingredient and the coven asked about, since one entry can be asked about
 * in two.
 */
export const cupboardEntryByIngredient = defineSignedInLoader<
  CupboardEntryKey,
  CupboardEntryRow | null,
  string
>(cupboardEntriesOf, {
  cacheKeyFn: (key) => `${key.workspaceId}:${key.ingredientId}`,
});
