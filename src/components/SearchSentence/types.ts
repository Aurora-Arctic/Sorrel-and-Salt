import type { SearchSentence as SearchSentenceFragments } from '../IngredientSearch/types';

export interface SearchSentenceProps {
  /** What the list is searching for, from `buildSearchSentence`. Its values are drawn as text, never links. */
  sentence: SearchSentenceFragments;
  query: string;
  pending: boolean;
  className?: string;
}
