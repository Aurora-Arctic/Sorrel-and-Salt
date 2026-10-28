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
// what the step needs against what the coven's jar holds, as `supplyOf` judges it. All four
// verdicts stand at the right end of the name's line, so the name is cut short before they are.
// Every verdict is a symbol alone (StockBadge's for Out and Low, supply-icon.tsx's for Not Enough
// and Units Differ): the words are the button's name and the reason is its IconTip (the owner's
// call, 2026-10-28), the verdict's `mark`. A step with an instruction only has
// no line. See claude-docs/components/spell-builder.md, "The aside".

const UNITS_DIFFER_TIP = 'The units don’t match, so it can’t tell if you have enough.';
const NOT_ENOUGH_TIP = 'The jar holds less than this step needs.';

const OUT_TIP = 'The jar is empty, so there is nothing to put in.';
const LOW_TIP = 'The jar is at or below the coven’s Low mark.';

const OutIcon = ({ className }: { className: string }): ReactElement => (
  <StockIcon out className={className} />
);
const LowIcon = ({ className }: { className: string }): ReactElement => (
  <StockIcon out={false} className={className} />
);

/** The verdict is its `mark` alone: the symbol in a button named `words`, whose IconTip says why. */
type Verdict = {
  words: string;
  tone: string;
  mark: { Icon: (props: { className: string }) => ReactElement; tip: string };
};

const VERDICTS: Partial<Record<StepSupply['kind'], Verdict>> = {
  out: { words: 'Out', tone: 'out', mark: { Icon: OutIcon, tip: OUT_TIP } },
  short: { words: 'Not Enough', tone: 'low', mark: { Icon: NotEnoughIcon, tip: NOT_ENOUGH_TIP } },
  'units-differ': {
    words: 'Units Differ',
    tone: 'muted',
    mark: { Icon: UnitsDifferIcon, tip: UNITS_DIFFER_TIP },
  },
  low: { words: 'Low', tone: 'low', mark: { Icon: LowIcon, tip: LOW_TIP } },
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
    verdict: (supply && VERDICTS[supply.kind]) ?? null,
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
            <IconTip tip={verdict.mark.tip}>
              <button type="button" className="spell-inventory__mark" aria-label={verdict.words}>
                <verdict.mark.Icon className="spell-inventory__icon" />
              </button>
            </IconTip>
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
