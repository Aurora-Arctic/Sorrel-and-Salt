import { canConvert, canMeasureAs, unitConvert } from '@/modules/ingredients';
import type { Unit } from '../ingredients/schema/units';

// The one function behind the completion and its preview, so the two cannot disagree. Amounts are held in thousandths,
// the stock columns' scale, so adding and subtracting stay exact.

export interface PlanStep {
  id: string;
  position: number;
  ingredientId: string | null;
  variantId: string | null;
  name: string | null;
  /** `numeric` text from the column, or a number. */
  quantity: string | number | null;
  unit: Unit | null;
}

export interface PlanJar {
  id: string;
  variantId: string;
  quantityOnHand: string | number | null;
  unit: Unit | null;
  /** The Low mark, `numeric` text from the column, or a number. */
  lowStockThreshold: string | number | null;
}

/** `units-differ` is drift since the spell was saved: a unit the jar cannot be measured in. */
export type NotDeductedReason =
  'custom' | 'unstocked' | 'no-quantity' | 'units-differ' | 'jar-not-measured';

export type StepPlan =
  | {
      kind: 'take';
      stepId: string;
      inventoryItemId: string;
      amount: number;
      unit: Unit;
      shortfall: number;
      /** In the jar's unit, as `lowStockThreshold` is. */
      before: number;
      lowStockThreshold: number | null;
    }
  | { kind: 'skip'; stepId: string; reason: NotDeductedReason }
  // Nothing to take, so not a warning.
  | { kind: 'none'; stepId: string };

const SCALE = 1000;
const thousandths = (value: string | number) => Math.round(Number(value) * SCALE);

export function planDeductions(steps: readonly PlanStep[], jars: readonly PlanJar[]): StepPlan[] {
  const jarOf = new Map(jars.map((jar) => [jar.variantId, jar]));
  // What each jar still holds as the plan goes: a spell may lay one form in several steps.
  const remaining = new Map<string, number>();

  return [...steps]
    .sort((a, b) => a.position - b.position)
    .map((step): StepPlan => {
      const stepId = step.id;
      const skip = (reason: NotDeductedReason): StepPlan => ({ kind: 'skip', stepId, reason });

      if (step.ingredientId == null) {
        return step.name != null ? skip('custom') : { kind: 'none', stepId };
      }
      const jar = step.variantId == null ? undefined : jarOf.get(step.variantId);
      if (!jar) return skip('unstocked');
      if (step.quantity == null || step.unit == null) return skip('no-quantity');
      if (jar.quantityOnHand == null || jar.unit == null) return skip('jar-not-measured');

      let need: number;
      if (!canMeasureAs(step.unit, jar.unit)) return skip('units-differ');
      if (canConvert(step.unit, jar.unit)) {
        const converted = unitConvert(Number(step.quantity), step.unit, jar.unit);
        if (!converted.ok) return skip('units-differ');
        need = thousandths(converted.value);
      } else {
        // The same count unit: `unitConvert` refuses every count, so there is nothing to convert.
        need = thousandths(step.quantity);
      }

      const held = remaining.get(jar.id) ?? thousandths(jar.quantityOnHand);
      const taken = Math.min(need, held);
      remaining.set(jar.id, held - taken);
      return {
        kind: 'take',
        stepId,
        inventoryItemId: jar.id,
        amount: taken / SCALE,
        unit: jar.unit,
        shortfall: (need - taken) / SCALE,
        before: held / SCALE,
        lowStockThreshold: jar.lowStockThreshold == null ? null : Number(jar.lowStockThreshold),
      };
    });
}
