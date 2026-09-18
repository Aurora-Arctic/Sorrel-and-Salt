// DESIGN.md §5's unit vocabulary, and the single place it is written down.
//
// **This module is the one module the acceptance criterion names.** Adding a
// unit means adding it to `UNITS_BY_DIMENSION` below and regenerating the
// migration — the pgEnum, the CHECK constraint that keeps `unit_dimension`
// honest, M9.5's `unitConvert()` and every later Zod enum are all built from
// this map rather than keeping lists of their own. A second list is how the
// database comes to admit a unit the converter has never heard of.
//
// It deliberately imports nothing. `src/db/schema/inventory-items.ts` imports
// it, and so will the conversion library and the Zod schemas, which must not
// reach the database layer (CLAUDE.md rule 2, MB.33) — a module all three can
// import is only possible if it depends on neither side.

export const UNIT_DIMENSIONS = ['weight', 'volume', 'count'] as const;

export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

// Metric and imperial in each of the three dimensions, in DESIGN.md §5's own
// order — ascending within each system, so a rendered dropdown reads the way
// a cook expects rather than alphabetically.
//
// **`fl oz` is stored as `fl_oz`.** §5 names the unit in prose, where a space
// is how a human writes it; this is the label a Postgres enum, a GraphQL enum
// (M9.4) and a URL query parameter (M9.7's filter chips) all have to carry,
// and of those a GraphQL enum value cannot contain a space at all. The unit
// is the one §5 names; only its spelling is settled here, and how it is
// *displayed* stays a question for the UI tasks rather than a column value.
//
// `satisfies` rather than a type annotation: the constraint proves every
// dimension is stocked and none is empty, while the literal types survive for
// `Unit` to be derived from below. Annotating would widen the values to
// `string` and take the whole vocabulary out of the type system.
export const UNITS_BY_DIMENSION = {
  weight: ['mg', 'g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup'],
  count: ['piece', 'drop', 'pinch'],
} as const satisfies Record<UnitDimension, readonly [string, ...string[]]>;

export type Unit = (typeof UNITS_BY_DIMENSION)[UnitDimension][number];

// The flattened vocabulary, in dimension order. `pgEnum` takes a non-empty
// tuple, which is why the type is spelled out rather than inferred as an
// array, and the spread is per dimension rather than a `flatMap` because a
// `flatMap` returns `Unit[]` — no longer a tuple, and no longer something
// `pgEnum` accepts. A dimension added above and forgotten here is caught by
// units.test.ts, which rebuilds this list from the map and compares.
export const UNITS: readonly [Unit, ...Unit[]] = [
  ...UNITS_BY_DIMENSION.weight,
  ...UNITS_BY_DIMENSION.volume,
  ...UNITS_BY_DIMENSION.count,
];

const DIMENSION_BY_UNIT = new Map<string, UnitDimension>(
  UNIT_DIMENSIONS.flatMap((dimension) =>
    UNITS_BY_DIMENSION[dimension].map((unit): [string, UnitDimension] => [unit, dimension]),
  ),
);

/**
 * The dimension a unit belongs to. Total over `Unit`, so there is no missing
 * case for a caller to guess at — the database stores the answer on the row
 * (DESIGN.md §5) and this is what computes it on the way in.
 */
export function dimensionOf(unit: Unit): UnitDimension {
  return DIMENSION_BY_UNIT.get(unit) as UnitDimension;
}

/**
 * Whether an arbitrary string is a unit this vocabulary names, narrowing it
 * to `Unit` when it is. The guard a parser needs at the edge: a request body
 * arrives as `string`, and nothing below this line should be handed one that
 * `dimensionOf` cannot answer for.
 */
export function isUnit(value: string): value is Unit {
  return DIMENSION_BY_UNIT.has(value);
}
