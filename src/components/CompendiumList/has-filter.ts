import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { CompendiumListFilterProps } from './types';

/** Whether the filter names anything, by the search sentence's own test. */
export function hasActiveFilter(filter: CompendiumListFilterProps['filter']): boolean {
  return buildSearchSentence({
    filter: {
      ...filter,
      toxic: filter.toxic || null,
      reviewed: null,
      source: filter.source || null,
      inStock: filter.inStock ?? false,
      lowStockOnly: filter.lowStockOnly ?? false,
    },
    total: 0,
  }).hasFilter;
}
