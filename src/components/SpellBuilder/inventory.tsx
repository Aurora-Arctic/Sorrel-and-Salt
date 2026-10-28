'use client';

import type { ReactElement } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import IconTip from '../IconTip';
import { JarDrawing, pickJarShape } from '../JarShelf';
import { StockIcon } from '../StockBadge';
import { stockState } from '../StockBadge/stock-state';
import { amountText } from '../StockBadge/stock-words';
import { UnitsDifferIcon, NotEnoughIcon } from './supply-icon';
import { type StepSupply, supplyOf } from './steps/supply';
import type { SpellStepValue, SpellStepsValues } from './steps/types';
import { isInstruction, stepNameOf } from './steps/values';

// In Coven Inventory (the Jar's aside): one line for each ingredient step, in step order, saying
// what the step needs against what the coven's jar holds, as `supplyOf` judges it. The
// verdict is words (Low, Out, Not Enough, Units Differ) so no state rests on colour. All four
// stand at the right end of the name's line, so the name is cut short before they are. Low and
// Out take StockBadge's colour and symbol; Not Enough has its own jar-level symbol in Low's ink. Units Differ is that struck equals sign alone (supply-icon.tsx), muted, its words the button's name and its reason in an IconTip. A step with an instruction only has
// no line. See claude-docs/components/spell-builder.md, "The aside".

const UNITS_DIFFER_TIP =
  'The spell’s unit can’t be checked against the jar’s, so it can’t tell if you have enough.';

type Verdict = { words: string; state: 'low' | 'out' | null; tone: string };

const VERDICTS: Record<StepSupply['kind'], Verdict> = {
  'one-off': { words: 'One-Off', state: null, tone: 'muted' },
  out: { words: 'Out', state: 'out', tone: 'out' },
  short: { words: 'Not Enough', state: null, tone: 'low' },
  'units-differ': { words: 'Units Differ', state: null, tone: 'muted' },
  low: { words: 'Low', state: 'low', tone: 'low' },
};

/** The line's words after the name, as the parts to join: need, hold, the verdict. */
export function holdWords(step: SpellStepValue): { parts: string[]; verdict: Verdict | null } {
  const supply = supplyOf(step);
  if (step.ingredientId === null) return { parts: ['one-off', 'nothing to hold'], verdict: null };
  const typed = step.quantity.trim();
  const need = typed === '' ? null : `need ${[typed, step.unit].filter(Boolean).join(' ')}`;
  const jar = step.jar;
  const hold =
    jar === null || jar.quantity === 0
      ? 'hold none'
      : jar.quantity === null
        ? 'hold unmeasured'
        : `hold ${amountText(jar.quantity, jar.unit)}`;
  return {
    parts: [need, hold].filter((part): part is string => part !== null),
    verdict: supply === null ? null : VERDICTS[supply.kind],
  };
}

function HoldLine({ step, seed }: { step: SpellStepValue; seed: string }): ReactElement {
  const { parts, verdict } = holdWords(step);
  const oneOff = step.ingredientId === null;
  const jar = step.jar;
  // The form only picks the vessel's shape here; it is not shown.
  const { form: formKey } = step;
  const state = jar ? stockState(jar.quantity, jar.threshold) : 'out';
  const modifier = oneOff || state === 'ok' ? '' : `jar-shelf__jar--${state}`;
  return (
    <li className={`spell-inventory__line${oneOff ? ' is-one-off' : ''}`}>
      <span className={`spell-inventory__jar ${modifier}`}>
        <JarDrawing shape={pickJarShape(seed, formKey ?? '')} held={oneOff ? null : jar} />
      </span>
      <span className="spell-inventory__title">
        <span className="spell-inventory__name">{stepNameOf(step)}</span>
        {verdict && (
          <span className={`spell-inventory__verdict is-${verdict.tone}`}>
            {verdict.words === 'Units Differ' ? (
              // The mark alone, its words the button's name and its reason in a tip (the owner's call, 2026-10-28).
              <IconTip tip={UNITS_DIFFER_TIP}>
                <button type="button" className="spell-inventory__mark" aria-label={verdict.words}>
                  <UnitsDifferIcon className="spell-inventory__icon" />
                </button>
              </IconTip>
            ) : verdict.state ? (
              <StockIcon out={verdict.state === 'out'} className="spell-inventory__icon" />
            ) : (
              <NotEnoughIcon className="spell-inventory__icon" />
            )}
            {verdict.words !== 'Units Differ' && verdict.words}
          </span>
        )}
      </span>
      <span className="spell-inventory__words">{parts.join(' · ')}</span>
    </li>
  );
}

export function InCovenInventory({ steps }: { steps: readonly SpellStepValue[] }): ReactElement {
  const lines = steps.filter((step) => !isInstruction(step));
  return (
    <section className="spell-inventory" aria-labelledby="spell-inventory-heading">
      <h5 id="spell-inventory-heading">In Coven Inventory</h5>
      {lines.length === 0 ? (
        <p className="spell-aside__empty">Nothing in the jar yet.</p>
      ) : (
        <ul className="spell-inventory__list">
          {lines.map((step, index) => (
            <HoldLine
              key={`${index}-${step.variantId ?? step.name}`}
              step={step}
              seed={step.ingredientId ?? step.name ?? ''}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** In Coven Inventory on the builder's own values, as the amounts stand as they are typed. */
export function SpellInventory(): ReactElement {
  const { control } = useFormContext<SpellStepsValues>();
  const steps = useWatch({ control, name: 'steps' }) ?? [];
  return <InCovenInventory steps={steps} />;
}
