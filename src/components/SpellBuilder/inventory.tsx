'use client';

import type { ReactElement, ReactNode } from 'react';
import JarLine from '../JarLine';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import type { StockDialogProps } from '../StockDialog/types';
import { stockState } from '../StockBadge/stock-state';
import { amountText } from '../StockBadge/stock-words';
import { needOf, supplyOf } from './steps/supply';
import type { SpellStepValue } from './steps/types';
import { verdictOf, type VerdictKind, VerdictMark } from './verdict-mark';
import { isInstruction, stepNameOf } from './steps/values';

// In the Cupboard: one line per form, at its first step's place, setting `needOf` against the jar's `supplyOf`, with a `VerdictMark` and `doorsOf` doors; used by the recipe page alone
// (claude-docs/components/spell-recipe.md, "The side column" and "The inventory panel").

/** What a line opens, where the page offers it: the Quick Look eye, and the Edit Stock dialog. */
export interface LineDoors {
  look?: ReactNode;
  edit?: StockDialogProps;
}

/** The line's words after the name, as the parts to join: need, have, the verdict ("have", not "hold"). */
export function holdWords(
  step: SpellStepValue,
  steps: readonly SpellStepValue[] = [step],
): { parts: string[]; verdict: VerdictKind | null } {
  const supply = supplyOf(step, steps);
  if (step.ingredientId === null) return { parts: ['one-off', 'not kept'], verdict: null };
  const jar = step.jar;
  const sameForm = steps.filter((other) => other.variantId === step.variantId);
  const needed = needOf(step.variantId === null ? [step] : sameForm, jar?.unit ?? null);
  const need = needed === null ? null : `need ${needed}`;
  const hold =
    jar === null
      ? 'have no jar'
      : jar.quantity === 0
        ? 'have none'
        : jar.quantity === null
          ? 'have unmeasured'
          : `have ${amountText(jar.quantity, jar.unit)}`;
  return {
    parts: [need, hold].filter((part): part is string => part !== null),
    verdict: verdictOf(supply),
  };
}

function HoldLine({
  step,
  steps,
  seed,
  doors,
}: {
  step: SpellStepValue;
  steps: readonly SpellStepValue[];
  seed: string;
  doors?: LineDoors;
}): ReactElement {
  const { parts, verdict } = holdWords(step, steps);
  const oneOff = step.ingredientId === null;
  const jar = step.jar;
  const edit = doors?.edit;
  // The form only picks the vessel's shape here; it is not shown.
  const { form: formKey } = step;
  return (
    <JarLine
      seed={seed}
      kind={formKey ?? ''}
      held={jar}
      // A form with no jar is drawn as the shelf draws one, dashed.
      tone={jar ? stockState(jar.quantity, jar.threshold) : 'empty'}
      oneOff={oneOff}
      name={stepNameOf(step)}
      press={
        edit && {
          ...edit,
          ariaLabel: ['Edit Stock', edit.ingredientName, step.form && formLabel(step.form)]
            .filter(Boolean)
            .join(', '),
        }
      }
      look={doors?.look}
      words={
        <>
          {/* The verdict's mark opens the words it is about: the need and the have. */}
          {verdict && <VerdictMark kind={verdict} />}
          <span>{parts.join(' · ')}</span>
        </>
      }
    />
  );
}

export function InCovenInventory({
  steps,
  doorsOf,
  id,
}: {
  steps: readonly SpellStepValue[];
  /** The section's id, for a jump link; the recipe page gives one. */
  id?: string;
  /** A line's doors, where the page offers them. */
  doorsOf?: (step: SpellStepValue) => LineDoors | undefined;
}): ReactElement {
  const ingredients = steps.filter((step) => !isInstruction(step));
  // A form laid in several steps is one line, at its first step's place (One Line Per Form).
  const lines = ingredients.filter(
    (step, index) =>
      step.ingredientId === null ||
      step.variantId === null ||
      ingredients.findIndex((other) => other.variantId === step.variantId) === index,
  );
  return (
    <section id={id} className="spell-inventory" aria-labelledby="spell-inventory-heading">
      <h2 id="spell-inventory-heading">In the Cupboard</h2>
      {lines.length === 0 ? (
        <p className="spell-aside__empty">Nothing in the jar yet.</p>
      ) : (
        <ul className="spell-inventory__list">
          {lines.map((step, index) => (
            <HoldLine
              key={`${index}-${step.variantId ?? step.name}`}
              step={step}
              steps={ingredients}
              seed={step.ingredientId ?? step.name ?? ''}
              doors={doorsOf?.(step)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
