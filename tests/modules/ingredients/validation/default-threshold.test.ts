import { describe, expect, it } from 'vitest';
import { UNITS, dimensionOf } from '@/modules/ingredients/schema/units';
import { defaultThreshold } from '@/modules/ingredients/validation/default-threshold';

// §5's default low-stock threshold, unit by unit, without a database:
// services/stock.test.ts keeps one write per call site to show the service
// stores what this returns.
describe('defaultThreshold', () => {
  // 3 for count, 10 g for weight and 15 ml for volume, in the unit asked for.
  it.each([
    ['piece', 3],
    ['drop', 3],
    ['g', 10],
    ['kg', 0.01],
    ['mg', 10000],
    ['oz', 0.353],
    ['ml', 15],
    ['l', 0.015],
    ['tsp', 3],
  ] as const)('answers %s with %d', (unit, threshold) => {
    expect(defaultThreshold(unit)).toBeCloseTo(threshold, 3);
  });

  // Converted rather than written per unit, so no unit is left without one.
  it('answers every unit in the vocabulary with a positive number', () => {
    for (const unit of UNITS) {
      const threshold = defaultThreshold(unit);
      expect(threshold, `${unit} (${dimensionOf(unit)})`).toBeGreaterThan(0);
    }
  });

  it('answers no unit with no threshold', () => {
    expect(defaultThreshold(null)).toBeNull();
  });
});
