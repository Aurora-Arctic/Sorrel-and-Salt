import { type Unit, dimensionOf } from '../../ingredients/schema/units';

// The unit rule, shared by the builder (on the step's Unit field) and the service (which refuses a save that breaks it).
// Built on the unit dimensions alone, not `unitConvert`, because a validation file imports only dependency-free files
// (claude-docs/modules.md, "validation/*.ts"); the two agree.

/** What a step measured in a unit its coven's jar cannot be measured in is told. */
export const UNMEASURABLE_UNIT = 'Choose a unit your coven’s stock of this can be measured in';

/** Whether an amount in `unit` can be taken out of a jar kept in `jarUnit`: the same unit, or two weights, or two volumes. */
export function measurable(unit: Unit, jarUnit: Unit): boolean {
  if (unit === jarUnit) return true;
  const dimension = dimensionOf(unit);
  return dimension !== 'count' && dimension === dimensionOf(jarUnit);
}
