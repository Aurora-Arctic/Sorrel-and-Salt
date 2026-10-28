'use client';

import type { ReactElement } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { JarDrawing, pickJarShape } from '../JarShelf';
import { StockIcon } from '../StockBadge';
import { stockState } from '../StockBadge/stock-state';
import { amountText } from '../StockBadge/stock-words';
import { type StepSupply, supplyOf } from './steps/supply';
import type { SpellStepValue, SpellStepsValues } from './steps/types';
import { isInstruction, stepNameOf } from './steps/values';

// What You Hold (the Jar's aside): one line for each ingredient step, in step order, saying
// what the step needs against what the coven's jar holds, as `supplyOf` judges it. The
// verdict is words (Low, Out, Not Enough, Cannot Compare) so no state rests on colour. Low and
// Out take StockBadge's colour and symbol and stand after the name, on its line, so the name
// is cut short before they are; Not Enough and Cannot Compare end the words line. A step with an instruction only has
// no line. See claude-docs/components/spell-builder.md, "The aside".

type Verdict = { words: string; state: 'low' | 'out' | null };

const VERDICTS: Record<StepSupply['kind'], Verdict> = {
  'one-off': { words: 'One-Off', state: null },
  out: { words: 'Out', state: 'out' },
  short: { words: 'Not Enough', state: null },
  'cannot-compare': { words: 'Cannot Compare', state: null },
  low: { words: 'Low', state: 'low' },
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
    <li className={`spell-hold__line${oneOff ? ' is-one-off' : ''}`}>
      <span className={`spell-hold__jar ${modifier}`}>
        <JarDrawing shape={pickJarShape(seed, formKey ?? '')} held={oneOff ? null : jar} />
      </span>
      <span className="spell-hold__title">
        <span className="spell-hold__name">{stepNameOf(step)}</span>
        {verdict?.state && (
          <span className={`spell-hold__verdict is-${verdict.state}`}>
            <StockIcon out={verdict.state === 'out'} className="spell-hold__icon" />
            {verdict.words}
          </span>
        )}
      </span>
      <span className="spell-hold__words">
        {parts.join(' · ')}
        {verdict && !verdict.state && ` · ${verdict.words}`}
      </span>
    </li>
  );
}

export function WhatYouHold({ steps }: { steps: readonly SpellStepValue[] }): ReactElement {
  const lines = steps.filter((step) => !isInstruction(step));
  return (
    <section className="spell-hold" aria-labelledby="spell-hold-heading">
      <h5 id="spell-hold-heading">What You Hold</h5>
      {lines.length === 0 ? (
        <p className="spell-aside__empty">Nothing in the jar yet.</p>
      ) : (
        <ul className="spell-hold__list">
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

/** What You Hold on the builder's own values, as the amounts stand as they are typed. */
export function SpellHold(): ReactElement {
  const { control } = useFormContext<SpellStepsValues>();
  const steps = useWatch({ control, name: 'steps' }) ?? [];
  return <WhatYouHold steps={steps} />;
}
