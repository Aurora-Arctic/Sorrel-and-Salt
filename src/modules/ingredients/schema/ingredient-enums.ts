// DESIGN.md §5's closed sets for an ingredient, written down once: the pgEnums
// in ingredients.ts and the Zod schemas in ../validation/ingredient.ts are
// both built from these lists. Like units.ts it imports nothing, so a client
// component reaches it without dragging in drizzle-orm.

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

/** The two kinds that carry no formal name; every other kind requires one. */
export const NAMELESS_KINDS: readonly NomenclatureKind[] = ['unknown', 'none'];

export const INGREDIENT_ELEMENTS = ['earth', 'air', 'fire', 'water', 'spirit'] as const;
