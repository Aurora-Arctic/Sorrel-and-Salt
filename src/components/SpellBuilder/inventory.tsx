'use client';

import type { ReactElement } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
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
// Every verdict is its words in its tone beside a symbol that only decorates (StockBadge's for Out
// and Low, supply-icon.tsx's for Not Enough and Units Differ), so nothing is read by hovering
// and the verdict adds no tab stop (the second design review, 2026-10-28). A step with an
// instruction only has no line. See claude-docs/components/spell-builder.md, "The aside".

const OutIcon = ({ className }: { className: string }): ReactElement => (
  <StockIcon out className={className} />
);
const LowIcon = ({ className }: { className: string }): ReactElement => (
  <StockIcon out={false} className={className} />
);

/** The verdict: its words, its tone, and the symbol drawn beside them. */
type Verdict = {
  words: string;
  tone: string;
  Icon: (props: { className: string }) => ReactElement;
};

const VERDICTS: Partial<Record<StepSupply['kind'], Verdict>> = {
  out: { words: 'Out', tone: 'out', Icon: OutIcon },
  short: { words: 'Not Enough', tone: 'low', Icon: NotEnoughIcon },
  'units-differ': {
    words: 'Units Differ',
    tone: 'muted',
    Icon: UnitsDifferIcon,
  },
  low: { words: 'Low', tone: 'low', Icon: LowIcon },
};

/** The line's words after the name, as the parts to join: need, hold, the verdict. */
export function holdWords(
  step: SpellStepValue,
  steps: readonly SpellStepValue[] = [step],
): { parts: string[]; verdict: Verdict | null } {
  const supply = supplyOf(step, steps);
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

function HoldLine({
  step,
  steps,
  seed,
}: {
  step: SpellStepValue;
  steps: readonly SpellStepValue[];
  seed: string;
}): ReactElement {
  const { parts, verdict } = holdWords(step, steps);
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
            <verdict.Icon className="spell-inventory__icon" />
            {verdict.words}
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
              steps={lines}
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
