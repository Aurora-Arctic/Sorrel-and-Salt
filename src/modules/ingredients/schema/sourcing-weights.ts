import 'server-only';
import type { NameBasis, ReferenceKind } from './ingredient-enums';

// Every number the sourcing score uses, read by the pure function and by the repository's sort expression, so the two cannot drift:
// change a weight here and both follow (claude-docs/design-decisions/m14.24-plan.md, "The score").

/** The facts the score lists, in the order it lists them. */
export const SOURCING_FACTS = [
  'sources',
  'bestSource',
  'nameBacked',
  'curatorReviewed',
  'nomenclatureUnknown',
  'noLocator',
  'safetyUnsourced',
  'formCitesNothing',
] as const;

/** Distinct live references across the entry and its live forms: one work cited five times is one source. */
export const SOURCES = { each: 10, cap: 30 } as const;

/** What the best source is worth: a scholarly work of any kind, else its kind's tier. */
export const BEST_SOURCE = {
  scholarly: 25,
  kinds: { book: 18, chapter: 18, entry: 18, article: 15, web_page: 8 },
} as const satisfies { scholarly: number; kinds: Record<ReferenceKind, number> };

/**
 * The share of citations naming the formal name, as `round(full × share)`; an entry whose
 * nomenclature takes no formal name gets `full`, as there is nothing to resolve.
 */
export const NAME_BACKED = {
  full: 15,
  backing: ['stated', 'resolved'] as const satisfies readonly NameBasis[],
} as const;

/** A curator's review mark. */
export const CURATOR_REVIEWED = 30;

/** An entry whose nomenclature is `unknown`. */
export const NOMENCLATURE_UNKNOWN = -10;

/** Each citation of a print source with no locator; a web page's URL is its locator, so it is not among the kinds. */
export const NO_LOCATOR = {
  each: -3,
  cap: -15,
  kinds: ['book', 'chapter', 'article', 'entry'] as const satisfies readonly ReferenceKind[],
} as const;

/** Safety notes on the entry or a form, and no live citation says it supports them: taken once. */
export const SAFETY_UNSOURCED = { points: -15, field: 'safetyNotes' } as const;

/** Each live form with no live citation of its own. */
export const FORM_CITES_NOTHING = { each: -5, cap: -15 } as const;

/** The host that marks a web page as Wikipedia, which scores as a web page and is named in the list. */
const WIKIPEDIA_HOST = 'wikipedia.org';

/** Whether a reference is a Wikipedia page: a web page whose host or URL names `wikipedia.org`. */
export function isWikipedia(reference: {
  kind: ReferenceKind;
  url: string | null;
  host: string | null;
}): boolean {
  if (reference.kind !== 'web_page') return false;
  return [reference.url, reference.host].some((text) =>
    text?.toLowerCase().includes(WIKIPEDIA_HOST),
  );
}
