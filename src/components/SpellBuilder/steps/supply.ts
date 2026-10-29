import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import type { Unit } from '@/modules/ingredients/schema/units';
import { stockState } from '../../StockBadge/stock-state';
import type { StepJar, SpellStepValue } from './types';

// What the coven's cupboard says about a step while it is built, as one
// value the row draws. Pure, so a test walks every case without rendering. Never a guess:
// where the step's unit cannot be set against the jar's, it says so (`unitConvert` refuses
// a count, and a pair from two dimensions), and does not call the jar enough or short.
// claude-docs/components/spell-builder.md, "Steps".

export type StepSupply =
  /** A one-off: nothing in the cupboard could ever answer it. */
  | { kind: 'one-off' }
  /** The coven keeps no jar of this form: told apart from an empty jar, and not called Out
   *, as the entry page's shelf draws such a form dashed, not red. */
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
 * all need, so each of its lines carries the same verdict.
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

/** A step's amount as typed: what `needOf` adds up. */
type NeedInput = Pick<SupplyInput, 'quantity' | 'unit'>;

// A numeric holds three decimals: a sum is rounded there, so 0.1 + 0.2 reads 0.3.
const rounded = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * What a form's steps need together, for its one line in In Coven Inventory: "3 tsp". One
 * amount stays as it was typed; amounts in one unit add as they are (a count too, since
 * nothing is converted); amounts in two units of one dimension add in the jar's unit through
 * `unitConvert`; anything else is listed, "1 tsp + 2 pinch", rather than guessed. A blank
 * amount adds nothing, and no amount at all is null.
 */
export function needOf(steps: readonly NeedInput[], jarUnit: Unit | null): string | null {
  const amounts = steps
    .map(({ quantity, unit }) => ({ typed: quantity.trim(), unit, value: Number(quantity) }))
    .filter(({ typed, value }) => typed !== '' && Number.isFinite(value) && value > 0);
  const text = (amount: string | number, unit: string) => [amount, unit].filter(Boolean).join(' ');
  const [first] = amounts;
  if (!first) return null;
  if (amounts.length === 1) return text(first.typed, first.unit);
  if (amounts.every(({ unit }) => unit === first.unit)) {
    return text(rounded(amounts.reduce((sum, { value }) => sum + value, 0)), first.unit);
  }
  if (jarUnit !== null) {
    let sum = 0;
    for (const { unit, value } of amounts) {
      const converted = unit === '' ? null : unitConvert(value, unit as Unit, jarUnit);
      if (!converted?.ok) return amounts.map(({ typed, unit: u }) => text(typed, u)).join(' + ');
      sum += converted.value;
    }
    return text(rounded(sum), jarUnit);
  }
  return amounts.map(({ typed, unit }) => text(typed, unit)).join(' + ');
}
