// DESIGN.md §5's closed sets for an ingredient and its references, written once: the pgEnums and the Zod schemas are built from these lists.
// Like units.ts it imports nothing, so a client component reaches it without dragging in drizzle-orm.

// `unknown` and `none` are both answers, not absences (ingredients.ts).
export const NOMENCLATURE_KINDS = [
  'botanical',
  'fungal',
  'zoological',
  'mineral',
  'chemical',
  'unknown',
  'none',
] as const;

export type NomenclatureKind = (typeof NOMENCLATURE_KINDS)[number];

/** The kind that takes no formal name: no naming system names the thing. */
export const NAMELESS_KIND = 'none' satisfies NomenclatureKind;

/**
 * The kind whose formal name is optional: one exists, its system unsettled,
 * so it may be recorded unconfirmed. Every other kind requires one.
 */
export const UNSETTLED_KIND = 'unknown' satisfies NomenclatureKind;

/** The kinds whose formal name is a binomial, printed in italics; a mineral's, a chemical's and an unsettled kind's are upright (claude-docs/styling.md, "Type"). */
export const BINOMIAL_KINDS: ReadonlySet<string> = new Set<NomenclatureKind>([
  'botanical',
  'fungal',
  'zoological',
]);

/** Whether a nomenclature’s formal name is set in italics; one rule for the entry page and the card. */
export const isBinomial = (kind: string): boolean => BINOMIAL_KINDS.has(kind);

export const INGREDIENT_ELEMENTS = ['earth', 'air', 'fire', 'water', 'spirit'] as const;
export type IngredientElement = (typeof INGREDIENT_ELEMENTS)[number];

// How Chicago renders a source: the kind decides the punctuation and
// the default italics, and which fields a row needs. `entry` is a
// reference-work entry, cited "under" its headword; there is no `other`,
// which would render a guess.
export const REFERENCE_KINDS = ['book', 'chapter', 'article', 'entry', 'web_page'] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

// How a citation names the ingredient it supports: `stated` prints the formal name, `resolved` maps a common name to one formal name by a cited authority,
// `unresolved` could not be mapped, and `unaudited` has not been checked. Null on a link means no answer was recorded.
export const NAME_BASES = ['stated', 'resolved', 'unresolved', 'unaudited'] as const;

export type NameBasis = (typeof NAME_BASES)[number];

// Not a column: the toxic setting a search takes, kept here so the
// GraphQL enum, the filter's Zod schema and the facet screen read one list.
// `any` is no filter; `toxic` keeps an entry flagged on itself or on a live
// form, and `not_toxic` one flagged on neither.
export const TOXIC_FILTERS = ['any', 'toxic', 'not_toxic'] as const;

export type ToxicFilter = (typeof TOXIC_FILTERS)[number];

// Not a column: how a search combines the categories it is given, kept
// here so the GraphQL enum, the filter's Zod schema and the repository read
// one list. `all` needs every category, `any` at least one.
export const CATEGORY_MODES = ['all', 'any'] as const;

export type CategoryMode = (typeof CATEGORY_MODES)[number];

// Not a column: where a coven's list entry comes from, kept here so the
// GraphQL enum, the filter's Zod schema and the coven's address read one list.
// `local` is the coven's own entry, `compendium` one it holds a jar of; leaving
// the setting out keeps both.
export const INGREDIENT_SOURCES = ['local', 'compendium'] as const;

export type IngredientSource = (typeof INGREDIENT_SOURCES)[number];

/** Which of the compendium's entries a curator's list reads: the shown ones (the public's only view), the hidden ones, or both. */
export const COMPENDIUM_LISTINGS = ['shown', 'hidden', 'all'] as const;
export type CompendiumListing = (typeof COMPENDIUM_LISTINGS)[number];
