import type { SearchSentence as SearchSentenceFragments } from '../IngredientSearch/types';

export interface SearchSentenceProps {
  /** What the list is searching for, from `buildSearchSentence`. Its values are drawn as text, never links. */
  sentence: SearchSentenceFragments;
  /** The text the person searched for; "" when none. It always shows, in the closed line. */
  query: string;
  /**
   * A search is on its way: the sentence is typed out in its place, hidden from
   * assistive technology. When it comes back (`false`), the count replaces the
   * lead, the clauses finish typing and the whole slides shut into one line.
   */
  pending: boolean;
  /** Joins the sentence's own class. */
  className?: string;
}
