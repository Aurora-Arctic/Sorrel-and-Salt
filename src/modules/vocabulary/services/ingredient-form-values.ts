import 'server-only';
import { findIngredientFormValues } from '../../../db/repository';
import type { PageEntry, PageRequest } from '../../../lib/types';
import type { IngredientFormValueRow } from '../types';

/**
 * One page of the curated form vocabulary, for `ingredientFormValues`: a
 * public read (MB.80), so no session, and the finder decides what counts as
 * curated — a live form under a live group.
 */
export function listIngredientFormValues(
  page: PageRequest,
): Promise<PageEntry<IngredientFormValueRow>[]> {
  return findIngredientFormValues(page);
}
