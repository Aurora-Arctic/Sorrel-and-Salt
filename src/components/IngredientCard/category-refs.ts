import type { CardCategory } from '../CategoryChips/types';
import type { CardCategoryRef } from './types';

/**
 * A card's categories for a list that gives its cards the vocabulary (`CardCategoryVocabulary`):
 * by id where the vocabulary holds it, so its name is not sent again, and whole where it does not.
 */
export function categoryRefs(
  categories: readonly CardCategory[],
  vocabulary: ReadonlySet<string>,
): (CardCategory | CardCategoryRef)[] {
  return categories.map((category) =>
    vocabulary.has(category.category.id)
      ? category.forms
        ? { id: category.category.id, forms: category.forms }
        : { id: category.category.id }
      : category,
  );
}
