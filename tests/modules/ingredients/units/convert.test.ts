import { describe, expect, it } from 'vitest';
import { unitConvert } from '@/modules/ingredients';
import { UNITS_BY_DIMENSION } from '@/modules/ingredients/schema/units';

// Each unit's size in its dimension's base unit, transcribed from the spec
// rather than imported, so the converter is checked against the spec.
// Milligrams for weight, millilitres for volume.
const SPECIFIED_SIZE: Record<string, number> = {
  mg: 1,
  g: 1000,
  kg: 1_000_000,
  oz: 28_349.523125,
  lb: 453_592.37,
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 250,
  fl_oz_uk: 28.4130625,
  fl_oz_us: 29.5735295625,
};

const CONVERTIBLE = [UNITS_BY_DIMENSION.weight, UNITS_BY_DIMENSION.volume];

// Values with the column's three decimals, small and large.
const SAMPLE = [0, 0.001, 0.525, 1, 7.25, 333.333, 1000, 123_456.789];

function valueOf(result: ReturnType<typeof unitConvert>): number {
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result.value;
}

describe('unitConvert', () => {
  describe('within a dimension', () => {
    // One of each unit into its base unit, rounded to three decimals: every
    // factor the task names, both fluid ounces included.
    it.each([
      [1, 'g', 'mg', 1000],
      [1, 'kg', 'mg', 1_000_000],
      [1, 'oz', 'mg', 28_349.523],
      [1, 'lb', 'mg', 453_592.37],
      [1, 'l', 'ml', 1000],
      [1, 'tsp', 'ml', 5],
      [1, 'tbsp', 'ml', 15],
      [1, 'cup', 'ml', 250],
      [1, 'fl_oz_uk', 'ml', 28.413],
      [1, 'fl_oz_us', 'ml', 29.574],
    ] as const)('converts %s %s to %s mg or ml', (value, from, to, expected) => {
      expect(unitConvert(value, from, to)).toEqual({ ok: true, value: expected });
    });

    // A thousand of each brings the factor's last digits above the rounding,
    // so a factor cut short to three decimals fails here.
    it.each([
      [1000, 'oz', 'g', 28_349.523],
      [1000, 'lb', 'kg', 453.592],
      [1000, 'fl_oz_uk', 'ml', 28_413.063],
      [1000, 'fl_oz_us', 'ml', 29_573.53],
    ] as const)('converts %s %s to %s exactly', (value, from, to, expected) => {
      expect(unitConvert(value, from, to)).toEqual({ ok: true, value: expected });
    });

    it.each([
      [3, 'tsp', 'tbsp', 1],
      [16, 'oz', 'lb', 1],
      [4, 'cup', 'l', 1],
      [1, 'fl_oz_us', 'fl_oz_uk', 1.041],
      [1, 'fl_oz_uk', 'fl_oz_us', 0.961],
      [2, 'tbsp', 'fl_oz_uk', 1.056],
    ] as const)('converts %s %s to %s %s', (value, from, to, expected) => {
      expect(unitConvert(value, from, to)).toEqual({ ok: true, value: expected });
    });

    // Every ordered pair, against the transcribed sizes in floating point: the
    // two can differ only by the final rounding.
    it('converts every pair of units in each dimension by their sizes', () => {
      for (const units of CONVERTIBLE) {
        for (const from of units) {
          for (const to of units) {
            for (const value of SAMPLE) {
              const expected = (value * SPECIFIED_SIZE[from]) / SPECIFIED_SIZE[to];

              expect(
                Math.abs(valueOf(unitConvert(value, from, to)) - expected),
              ).toBeLessThanOrEqual(0.0005 + 1e-9);
            }
          }
        }
      }
    });

    // Rounding half a thousandth up, as Postgres rounds a numeric(12,3).
    it('rounds a half thousandth up', () => {
      // 0.0005 kg
      expect(unitConvert(0.5, 'g', 'kg')).toEqual({ ok: true, value: 0.001 });
      // 1000.5 mg is 1.0005 g, which a float times a thousand puts below the half.
      expect(unitConvert(1000.5, 'mg', 'g')).toEqual({ ok: true, value: 1.001 });
    });
  });

  describe('precision', () => {
    // Each case lands within a rounding of a boundary once it reaches the base
    // unit: 0.525 oz is 14,883.499640625 mg, which rounds to 14,883.5 mg and
    // then to 14.884 g, a thousandth off the true 14.883.
    it.each([
      [0.525, 'oz', 'g', 14.883],
      [0.115, 'fl_oz_uk', 'fl_oz_us', 0.11],
      [0.317, 'fl_oz_us', 'cup', 0.037],
    ] as const)('rounds %s %s to %s once, at the end', (value, from, to, expected) => {
      expect(unitConvert(value, from, to)).toEqual({ ok: true, value: expected });
    });

    it('gives three decimals at most', () => {
      for (const units of CONVERTIBLE) {
        for (const from of units) {
          for (const to of units) {
            const value = valueOf(unitConvert(1, from, to));

            expect(Math.round(value * 1000) / 1000).toBe(value);
          }
        }
      }
    });
  });

  describe('round trips', () => {
    // Out to a unit no larger and back: the outbound rounding is under half a
    // thousandth of the original unit, so the original comes back exactly.
    it('returns the original through a finer or equal unit', () => {
      for (const units of CONVERTIBLE) {
        for (const from of units) {
          for (const via of units) {
            if (SPECIFIED_SIZE[via] > SPECIFIED_SIZE[from]) continue;

            for (const value of SAMPLE) {
              const there = valueOf(unitConvert(value, from, via));

              expect(unitConvert(there, via, from)).toEqual({ ok: true, value });
            }
          }
        }
      }
    });

    // Out to a coarser unit, three decimals of it is all there is to come back:
    // 1 mg is 0.000 lb. The return is off by no more than that rounding.
    it('returns the original within half a thousandth of a coarser unit', () => {
      for (const units of CONVERTIBLE) {
        for (const from of units) {
          for (const via of units) {
            if (SPECIFIED_SIZE[via] <= SPECIFIED_SIZE[from]) continue;

            const outbound = (0.0005 * SPECIFIED_SIZE[via]) / SPECIFIED_SIZE[from];

            for (const value of SAMPLE) {
              const back = valueOf(unitConvert(valueOf(unitConvert(value, from, via)), via, from));

              expect(Math.abs(back - value)).toBeLessThanOrEqual(outbound + 0.0005 + 1e-9);
            }
          }
        }
      }
    });
  });

  describe('refusals', () => {
    it('refuses weight to volume and volume to weight, for every pair', () => {
      for (const weight of UNITS_BY_DIMENSION.weight) {
        for (const volume of UNITS_BY_DIMENSION.volume) {
          expect(unitConvert(1, weight, volume)).toEqual({ ok: false, reason: 'dimension' });
          expect(unitConvert(1, volume, weight)).toEqual({ ok: false, reason: 'dimension' });
        }
      }
    });

    // Count converts to nothing, itself included: three pinches is no amount
    // of pieces either.
    it('refuses any conversion involving count, in either position', () => {
      const all = [...CONVERTIBLE.flat(), ...UNITS_BY_DIMENSION.count];

      for (const count of UNITS_BY_DIMENSION.count) {
        for (const other of all) {
          expect(unitConvert(1, count, other)).toEqual({ ok: false, reason: 'count' });
          expect(unitConvert(1, other, count)).toEqual({ ok: false, reason: 'count' });
        }
      }
    });

    it('refuses with a result the caller must test, not null or NaN', () => {
      const result = unitConvert(1, 'g', 'ml');

      // @ts-expect-error `value` exists only once `ok` has been tested.
      const unread: unknown = result.value;

      expect(result.ok).toBe(false);
      expect(unread).toBeUndefined();
    });

    // A programming error rather than a refusal: the stock schema refuses a
    // non-number or a negative amount before a service could call this.
    it('throws on a negative value or one that is not a finite number', () => {
      for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
        expect(() => unitConvert(value, 'g', 'kg')).toThrow(RangeError);
      }
    });
  });
});
