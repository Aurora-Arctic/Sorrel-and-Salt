import { describe, expect, it } from 'vitest';
import {
  UNITS,
  UNITS_BY_DIMENSION,
  UNIT_DIMENSIONS,
  dimensionOf,
  isUnit,
  type Unit,
} from '@/lib/units';

// DESIGN.md §5, transcribed here rather than imported, so that the assertions
// below compare the module against the specification instead of against
// itself. `fl oz` is spelled `fl_oz` — see the module's own comment for why
// the label carries an underscore where the design doc's prose carries a
// space.
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

  // The flat list is what the pgEnum and every future Zod enum are built
  // from, so it has to be the map flattened rather than a second list that
  // happens to agree today. Adding a dimension without spreading it into
  // UNITS reddens this and nothing else would.
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

  // Why the answers above are unambiguous rather than merely first-wins: no
  // unit belongs to two dimensions, so there is exactly one right answer to
  // give. M9.5's conversion refuses across dimensions, and a unit sitting in
  // two of them would make that refusal meaningless.
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

  // The guard is a type predicate as well as a runtime check — this is the
  // call shape every parser reaching the database will use, and it has to
  // narrow `string` to `Unit` for the row it builds to typecheck.
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
