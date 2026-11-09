import Fuse from 'fuse.js';

// Loose matching for text a person half-remembers: every typed word must match somewhere, in any order, partly or with a
// small typo, best match first (claude-docs/components/combobox.md, "The type-ahead box").

// Calibrated on the invitation refusals: 0.4 forgives a transposed letter ("emial") and 0.45 starts listing unrelated sentences.
const THRESHOLD = 0.4;

// Fuse's extended search reads these at a word's edges as operators, and "|" alone as "or"; a person typing one means the word.
// An apostrophe inside a word ("isn't") is no operator and stays.
const OPERATOR_EDGES = /^[|!^=']+|[|$]+$/g;

export function fuzzyMatcher<T>(
  items: readonly T[],
  text: (item: T) => string,
): (query: string) => T[] {
  const fuse = new Fuse(
    items.map((item) => ({ item, text: text(item) })),
    {
      keys: ['text'],
      threshold: THRESHOLD,
      ignoreLocation: true,
      useExtendedSearch: true,
      minMatchCharLength: 2,
    },
  );
  return (query) => {
    // A one-letter word matches nothing at the two-letter minimum, and every word must match, so it is dropped.
    const words = query
      .split(/\s+/)
      .map((word) => word.replace(OPERATOR_EDGES, ''))
      .filter((word) => word.length > 1);
    if (words.length === 0) return [...items];
    return fuse.search(words.join(' ')).map((found) => found.item.item);
  };
}
