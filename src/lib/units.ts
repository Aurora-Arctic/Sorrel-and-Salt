// DESIGN.md §5's unit vocabulary, and the single place it is written down.
// Both pgEnums, the CHECK constraint, `unitConvert()` and every later Zod enum
// are built from the map below, so adding a unit is one edit plus a regenerated
// migration. It imports nothing, which is what lets the schema, the converter
// and the Zod schemas all import it — the latter two may not reach the database
// layer (CLAUDE.md rule 2).
// See claude-docs/db.md, "Stock, and the one module that owns the units".

export const UNIT_DIMENSIONS = ['weight', 'volume', 'count'] as const;

export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

// In §5's own order — ascending within each system, so a rendered dropdown
// reads the way a cook expects rather than alphabetically. `fl oz` is stored as
// `fl_oz`: a GraphQL enum value cannot contain a space.
//
// `satisfies` rather than a type annotation — the constraint proves every
// dimension is stocked and none is empty, while the literal types survive for
// `Unit` to be derived. Annotating would widen the values to `string`.
export const UNITS_BY_DIMENSION = {
  weight: ['mg', 'g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup'],
  count: ['piece', 'drop', 'pinch'],
} as const satisfies Record<UnitDimension, readonly [string, ...string[]]>;

export type Unit = (typeof UNITS_BY_DIMENSION)[UnitDimension][number];

// Flattened, in dimension order. `pgEnum` takes a non-empty tuple, so the type
// is spelled out rather than inferred, and the spread is per dimension because
// a `flatMap` returns `Unit[]` — no longer a tuple. A dimension added above and
// forgotten here is caught by units.test.ts.
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
 * case for a caller to guess at.
 */
export function dimensionOf(unit: Unit): UnitDimension {
  return DIMENSION_BY_UNIT.get(unit) as UnitDimension;
}

/**
 * Whether an arbitrary string is a unit this vocabulary names, narrowing it to
 * `Unit`. The guard a parser needs at the edge: a request body arrives as
 * `string`, and nothing below should be handed one `dimensionOf` cannot answer.
 */
export function isUnit(value: string): value is Unit {
  return DIMENSION_BY_UNIT.has(value);
}
