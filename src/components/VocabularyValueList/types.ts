import type { Route } from 'next';

/**
 * A flat curated vocabulary an admin page lists (MB.95), by the ingredient
 * list it curates: one name and a description per row, no group.
 */
export type FlatVocabulary = 'planets' | 'zodiacSigns';

/** How a flat vocabulary's page is addressed and what it calls its rows. */
export interface VocabularyCopy {
  path: Route;
  /** The page's heading and its tab's title. */
  title: string;
  /** One row, lower-case, as a sentence says it: "planet". */
  noun: string;
  /** More than one, lower-case: "planets". */
  plural: string;
  /** One row in title case, as a button says it: "Add Planet". */
  label: string;
}

/** One value as the list shows it, and the address that opens it to edit. */
export interface VocabularyValueListEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  editHref: Route;
}

export interface VocabularyValueListProps {
  vocabulary: FlatVocabulary;
  values: readonly VocabularyValueListEntry[];
  /** The name query the page shows, blank for none, which the filter starts from and compares against. */
  query: string;
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager. */
  position?: { page: number; pages: number };
}

/** Where the list stands: its query, and the cursor of the page a modal opens over. */
export interface VocabularyPlace {
  query?: string;
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or a value's by slug. */
export type VocabularyDialog = 'new' | { edit: string };

/** What the filter form starts from: the vocabulary, and the query shown. */
export type VocabularyValueListFilterProps = Pick<VocabularyValueListProps, 'vocabulary' | 'query'>;
