import { describe, expect, it } from 'vitest';
import {
  UNITS,
  UNITS_BY_DIMENSION,
  UNIT_DIMENSIONS,
  dimensionOf,
  isUnit,
  type Unit,
} from '@/lib/units';

// DESIGN.md §5 transcribed rather than imported, so the module is compared
// against the spec, not itself. `fl oz` is spelled `fl_oz` — see the module.
const SPECIFIED = {
  weight: ['mg', 'g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup'],
  count: ['piece', 'drop', 'pinch'],
};

describe('unit vocabulary', () => {
  it('names the three dimensions DESIGN.md §5 names', () => {
    expect([...UNIT_DIMENSIONS]).toEqual(['weight', 'volume', 'count']);
  });

  it('covers metric and imperial in each dimension', () => {
    for (const [dimension, units] of Object.entries(SPECIFIED)) {
      expect([...UNITS_BY_DIMENSION[dimension as keyof typeof SPECIFIED]]).toEqual(units);
    }
  });

  // The flat list must be the map flattened, not a second list that agrees today.
  it('flattens to every unit the map holds, and nothing more', () => {
    const fromMap = UNIT_DIMENSIONS.flatMap((dimension) => [...UNITS_BY_DIMENSION[dimension]]);

    expect([...UNITS]).toEqual(fromMap);
  });

  it('lists no unit twice', () => {
    expect(new Set(UNITS).size).toBe(UNITS.length);
  });
});

describe('dimensionOf', () => {
  it('answers for every unit in the vocabulary', () => {
    for (const dimension of UNIT_DIMENSIONS) {
      for (const unit of UNITS_BY_DIMENSION[dimension]) {
        expect(dimensionOf(unit)).toBe(dimension);
      }
    }
  });

  // No unit belongs to two dimensions, so there is exactly one answer — what
  // makes a cross-dimension refusal meaningful.
  it('has one dimension to answer with, never two', () => {
    const seen = new Map<string, string>();

    for (const dimension of UNIT_DIMENSIONS) {
      for (const unit of UNITS_BY_DIMENSION[dimension]) {
        expect(seen.get(unit)).toBeUndefined();
        seen.set(unit, dimension);
      }
    }
  });
});

describe('isUnit', () => {
  it('accepts every unit the vocabulary names', () => {
    for (const unit of UNITS) {
      expect(isUnit(unit)).toBe(true);
    }
  });

  it('rejects a string the vocabulary does not name', () => {
    for (const value of ['dram', 'gallon', 'g ', 'G', '', 'weight']) {
      expect(isUnit(value)).toBe(false);
    }
  });

  // A type predicate as well as a runtime check: parsers need `string`
  // narrowed to `Unit`.
  it('narrows a string to a Unit', () => {
    const value: string = 'tsp';

    expect(isUnit(value) ? dimensionOf(value) : 'not a unit').toBe('volume');
  });
});

describe('Unit type', () => {
  it('admits every unit in the map', () => {
    const everyUnit: Unit[] = [...UNITS];

    expect(everyUnit).toHaveLength(14);
  });
});
