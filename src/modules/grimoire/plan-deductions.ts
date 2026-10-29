import { unitConvert } from '@/modules/ingredients';
import { dimensionOf, type Unit } from '../ingredients/schema/units';

// What completing a working would take from the coven's jars, decided without touching them. The one
// function behind both the completion (M13.5) and the preview before it (M13.6, M13.7), so the two
// cannot disagree: it reads only the steps and jars it is handed and writes nothing. Amounts are
// held in thousandths, the stock columns' scale, so adding and subtracting stay exact.

/** The part of a spell step the plan reads. */
export interface PlanStep {
  id: string;
  position: number;
  ingredientId: string | null;
  variantId: string | null;
  /** The typed name of a custom step. */
  name: string | null;
  /** `numeric` text from the column, or a number. */
  quantity: string | number | null;
  unit: Unit | null;
}

/** The part of a stock row the plan reads. */
export interface PlanJar {
  id: string;
  variantId: string;
  quantityOnHand: string | number | null;
  unit: Unit | null;
}

/**
 * Why nothing is taken for an ingredient step: a custom (typed-name) step, a form the coven holds no jar of, a step with no
 * amount, a unit the jar cannot be measured in (drift since the spell was saved), or a jar kept without an amount.
 */
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
    }
  | { kind: 'skip'; stepId: string; reason: NotDeductedReason }
  /** An instruction-only step: it has nothing to take, so it is not a warning. */
  | { kind: 'none'; stepId: string };

const SCALE = 1000;
const thousandths = (value: string | number) => Math.round(Number(value) * SCALE);

/** One entry per step, in step order. */
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
        // A custom step names its ingredient by typing it; an instruction-only step names none.
        return step.name != null ? skip('custom') : { kind: 'none', stepId };
      }
      const jar = step.variantId == null ? undefined : jarOf.get(step.variantId);
      if (!jar) return skip('unstocked');
      if (step.quantity == null || step.unit == null) return skip('no-quantity');
      if (jar.quantityOnHand == null || jar.unit == null) return skip('jar-not-measured');

      let need: number;
      if (dimensionOf(step.unit) === 'count' || dimensionOf(jar.unit) === 'count') {
        // `unitConvert` refuses every count, so a count is the same unit or it is refused here.
        if (step.unit !== jar.unit) return skip('units-differ');
        need = thousandths(step.quantity);
      } else {
        const converted = unitConvert(Number(step.quantity), step.unit, jar.unit);
        if (!converted.ok) return skip('units-differ');
        need = thousandths(converted.value);
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
      };
    });
}
