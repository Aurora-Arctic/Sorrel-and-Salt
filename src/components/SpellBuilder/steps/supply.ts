import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import type { Unit } from '@/modules/ingredients/schema/units';
import { stockState } from '../../StockBadge/stock-state';
import type { StepJar, SpellStepValue } from './types';

// What the coven's cupboard says about a step while it is built (M10.19, story 54), as one
// value the row draws. Pure, so a test walks every case without rendering. Never a guess:
// where the step's unit cannot be set against the jar's, it says so (`unitConvert` refuses
// a count, and a pair from two dimensions), and does not call the jar enough or short.
// claude-docs/components/spell-builder.md, "Steps".

export type StepSupply =
  /** A one-off: nothing in the cupboard could ever answer it. */
  | { kind: 'one-off' }
  /** The coven keeps no jar of this form: told apart from an empty jar, and not called Out
   *  (the owner, 2026-10-29), as the entry page's shelf draws such a form dashed, not red. */
  | { kind: 'no-jar' }
  /** The jar is empty: StockBadge's Out of Stock. */
  | { kind: 'out'; jar: StepJar }
  /** The jar holds less than the step calls for, once both are in one unit. */
  | { kind: 'short'; held: number; unit: Unit }
  /** The step's amount cannot be set against the jar's, so no verdict is given. */
  | { kind: 'units-differ' }
  /** The jar is at or below its own threshold: StockBadge's Low Stock. */
  | { kind: 'low'; jar: StepJar };

type SupplyInput = Pick<SpellStepValue, 'name' | 'ingredientId' | 'variantId' | 'jar'> & {
  quantity: string;
  unit: string;
};

/**
 * The step's supply, or null where there is nothing to flag (and for an instruction).
 * `steps` is the whole jar: a form laid in several steps is judged on the sum of what they
 * all need, so each of its lines carries the same verdict (the owner, 2026-10-28).
 */
export function supplyOf(
  step: SupplyInput,
  steps: readonly SupplyInput[] = [step],
): StepSupply | null {
  if (step.name === null) return null;
  if (step.ingredientId === null || step.variantId === null) return { kind: 'one-off' };
  const jar = step.jar;
  if (jar === null) return { kind: 'no-jar' };
  if (jar.quantity === 0) return { kind: 'out', jar };
  // Held but not weighed: nothing to compare against.
  if (jar.quantity === null) return null;

  // Every step on this form, this one included, summed in the jar's unit. One that cannot be
  // converted leaves the sum unknown, so no verdict on the amount is given.
  let needed = 0;
  for (const other of steps.filter((s) => s.variantId === step.variantId)) {
    const amount = other.quantity.trim() === '' ? 0 : Number(other.quantity);
    if (other.unit === '' || !Number.isFinite(amount) || amount <= 0) continue;
    if (jar.unit === null) return { kind: 'units-differ' };
    const converted = unitConvert(amount, other.unit as Unit, jar.unit);
    if (!converted.ok) return { kind: 'units-differ' };
    needed += converted.value;
  }
  if (jar.unit !== null && needed > jar.quantity) {
    return { kind: 'short', held: jar.quantity, unit: jar.unit };
  }
  return stockState(jar.quantity, jar.threshold) === 'low' ? { kind: 'low', jar } : null;
}
