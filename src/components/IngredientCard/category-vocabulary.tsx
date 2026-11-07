'use client';

import { createContext, useContext, useMemo, type ReactElement } from 'react';
import type { CardCategory } from '../CategoryChips/types';
import type { CardCategoryVocabularyProps, CardCategoryRef } from './types';

// The categories a list's cards name by id, so each category's name and group colours reach the
// browser once, in the vocabulary the filter already takes, rather than once per card wearing it.

const Vocabulary = createContext<ReadonlyMap<string, CardCategory>>(new Map());

/** Gives the cards beneath it the categories their ids name. */
export const CardCategoryVocabulary = ({
  categories,
  children,
}: CardCategoryVocabularyProps): ReactElement => {
  const byId = useMemo(
    () =>
      new Map(
        categories.map(({ id, name, group }) => [
          id,
          {
            category: { id, name },
            group: { colorDark: group.colorDark, colorLight: group.colorLight },
          },
        ]),
      ),
    [categories],
  );
  return <Vocabulary.Provider value={byId}>{children}</Vocabulary.Provider>;
};

/** A card's categories with their names and groups, each id read from the vocabulary above it. */
export function useNamedCategories(categories: readonly CardCategoryRef[]): CardCategory[] {
  const byId = useContext(Vocabulary);
  return categories.flatMap((category) => {
    const named = byId.get(category.id);
    if (named == null) return [];
    return [category.forms ? { ...named, forms: category.forms } : named];
  });
}
