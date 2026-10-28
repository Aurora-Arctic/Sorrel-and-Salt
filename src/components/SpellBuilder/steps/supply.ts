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
  /** The jar is empty, or the coven holds none of this form: StockBadge's Out of Stock. */
  | { kind: 'out'; jar: StepJar | null }
  /** The jar holds less than the step calls for, once both are in one unit. */
  | { kind: 'short'; held: number; unit: Unit }
  /** The step's amount cannot be set against the jar's, so no verdict is given. */
  | { kind: 'cannot-compare' }
  /** The jar is at or below its own threshold: StockBadge's Low Stock. */
  | { kind: 'low'; jar: StepJar };

type SupplyInput = Pick<SpellStepValue, 'name' | 'ingredientId' | 'variantId' | 'jar'> & {
  quantity: string;
  unit: string;
};

/** The step's supply, or null where there is nothing to flag (and for an instruction). */
export function supplyOf(step: SupplyInput): StepSupply | null {
  if (step.name === null) return null;
  if (step.ingredientId === null || step.variantId === null) return { kind: 'one-off' };
  const jar = step.jar;
  if (jar === null || jar.quantity === 0) return { kind: 'out', jar };
  // Held but not weighed: nothing to compare against.
  if (jar.quantity === null) return null;

  const needed = step.quantity.trim() === '' ? 0 : Number(step.quantity);
  if (step.unit !== '' && Number.isFinite(needed) && needed > 0) {
    if (jar.unit === null) return { kind: 'cannot-compare' };
    const converted = unitConvert(needed, step.unit as Unit, jar.unit);
    if (!converted.ok) return { kind: 'cannot-compare' };
    if (converted.value > jar.quantity)
      return { kind: 'short', held: jar.quantity, unit: jar.unit };
  }
  return stockState(jar.quantity, jar.threshold) === 'low' ? { kind: 'low', jar } : null;
}
