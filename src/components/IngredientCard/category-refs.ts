import type { CardCategory } from '../CategoryChips/types';
import type { CardCategoryRef } from './types';

/** A card's categories by id, for a list whose `CardCategoryVocabulary` names them. */
export function categoryRefs(categories: readonly CardCategory[]): CardCategoryRef[] {
  return categories.map(({ category: { id }, forms }) => (forms ? { id, forms } : { id }));
}
