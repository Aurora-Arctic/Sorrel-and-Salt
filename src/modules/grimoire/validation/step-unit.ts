import { type Unit, dimensionOf } from '../../ingredients/schema/units';

// Built on the unit dimensions alone, not `unitConvert`, because a validation file imports only dependency-free files
// (claude-docs/modules.md, "The public surface"); the two agree.

export const UNMEASURABLE_UNIT = 'Choose a unit your coven’s stock of this can be measured in';

export function measurable(unit: Unit, jarUnit: Unit): boolean {
  if (unit === jarUnit) return true;
  const dimension = dimensionOf(unit);
  return dimension !== 'count' && dimension === dimensionOf(jarUnit);
}
