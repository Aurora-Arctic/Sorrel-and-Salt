// DESIGN.md §5's unit vocabulary, written down once: both pgEnums, the CHECK
// constraint, `unitConvert()` and every Zod enum are built from this map. It
// imports nothing, so the schema, the converter and the Zod schemas all reach it.
// See claude-docs/db/stock.md, "Stock, and the one module that owns the units".

export const UNIT_DIMENSIONS = ['weight', 'volume', 'count'] as const;

export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

// §5's order, ascending within each system. `fl oz` is two units, `fl_oz_uk` and `fl_oz_us` (28.413 ml and 29.574 ml), because converting
// needs to know which; a GraphQL enum value cannot contain a space. `satisfies` keeps the literal types `Unit` is derived from.
export const UNITS_BY_DIMENSION = {
  weight: ['mg', 'g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'tsp', 'tbsp', 'fl_oz_uk', 'fl_oz_us', 'cup'],
  count: ['piece', 'drop', 'pinch'],
} as const satisfies Record<UnitDimension, readonly [string, ...string[]]>;

export type Unit = (typeof UNITS_BY_DIMENSION)[UnitDimension][number];

// `pgEnum` takes a non-empty tuple and a `flatMap` returns `Unit[]`, so the
// spread is per dimension and the type spelled out.
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

/** The dimension a unit belongs to; total over `Unit`. */
export function dimensionOf(unit: Unit): UnitDimension {
  return DIMENSION_BY_UNIT.get(unit) as UnitDimension;
}

/** Narrows an arbitrary string — a request body's — to `Unit`. */
export function isUnit(value: string): value is Unit {
  return DIMENSION_BY_UNIT.has(value);
}
