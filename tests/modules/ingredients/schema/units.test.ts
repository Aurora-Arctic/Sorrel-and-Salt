import { describe, expect, it } from 'vitest';
import {
  UNITS,
  UNITS_BY_DIMENSION,
  UNIT_DIMENSIONS,
  dimensionOf,
  isUnit,
} from '@/modules/ingredients/schema/units';

// DESIGN.md §5 transcribed rather than imported, so the module is compared
// against the spec, not itself. `fl oz` is two units, `fl_oz_uk` and `fl_oz_us` — see the module.
const SPECIFIED = {
  weight: ['mg', 'g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'tsp', 'tbsp', 'fl_oz_uk', 'fl_oz_us', 'cup'],
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
});

describe('dimensionOf', () => {
  it('answers for every unit in the vocabulary', () => {
    for (const dimension of UNIT_DIMENSIONS) {
      for (const unit of UNITS_BY_DIMENSION[dimension]) {
        expect(dimensionOf(unit)).toBe(dimension);
      }
    }
  });
});

describe('isUnit', () => {
  it('accepts a unit the vocabulary names', () => {
    expect(isUnit('tsp')).toBe(true);
  });

  it('rejects a string the vocabulary does not name', () => {
    for (const value of ['dram', 'gallon', 'g ', 'G', '', 'weight']) {
      expect(isUnit(value)).toBe(false);
    }
  });
});
