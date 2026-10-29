import { type Unit, dimensionOf } from '../schema/units';
import { unitConvert } from '../units/convert';

/**
 * §5's default low-stock threshold in `unit`: 3 of a count unit, and 10 g or 15 ml converted into a weight or a volume; none without a unit.
 * Here, not in the stock service, so the demo seed reads the same rule: a seed may reach a module's index, `schema/` and `validation/` only.
 */
export function defaultThreshold(unit: Unit | null): number | null {
  if (unit === null) return null;
  const dimension = dimensionOf(unit);
  if (dimension === 'count') return 3;
  const converted =
    dimension === 'weight' ? unitConvert(10, 'g', unit) : unitConvert(15, 'ml', unit);
  // Within one dimension the converter has nothing to refuse.
  if (!converted.ok) throw new Error(`no default threshold in ${unit}: ${converted.reason}`);
  return converted.value;
}
