import type { HelpFormAudience, HelpFormKind } from './types';

export const NOUNS: Record<HelpFormKind, string> = {
  faq: 'FAQ Entry',
  article: 'Article',
  guide: 'Guide',
  term: 'Term',
};

export const AUDIENCE_LABELS: Record<HelpFormAudience, string> = {
  public: 'Public',
  staff: 'Staff',
  keeper: 'Keeper',
};

/** How narrow each audience is: a sub page's is at least its guide's. */
export const NARROWNESS: Record<HelpFormAudience, number> = { public: 0, staff: 1, keeper: 2 };

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** "second" for 2, then "9th" past the words. */
export function ordinal(place: number): string {
  const word = ORDINALS[place - 1];
  if (word) return word;
  const tens = place % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[place % 10] ?? 'th');
  return `${place}${suffix}`;
}
