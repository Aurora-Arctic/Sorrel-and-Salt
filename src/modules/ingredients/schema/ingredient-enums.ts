// DESIGN.md §5's closed sets for an ingredient and its references, written
// down once: the pgEnums in ingredients.ts and references.ts, and the Zod
// schemas in ../validation/, are built from these lists. Like units.ts it
// imports nothing, so a client component reaches it without dragging in
// drizzle-orm.

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
 * so it may be recorded unconfirmed (MB.161). Every other kind requires one.
 */
export const UNSETTLED_KIND = 'unknown' satisfies NomenclatureKind;

export const INGREDIENT_ELEMENTS = ['earth', 'air', 'fire', 'water', 'spirit'] as const;

// How Chicago renders a source (MB.151): the kind decides the punctuation and
// the default italics, and which fields a row needs. `entry` is a
// reference-work entry, "s.v."; there is no `other`, which would render a guess.
export const REFERENCE_KINDS = ['book', 'chapter', 'article', 'entry', 'web_page'] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number];
