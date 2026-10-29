'use client';

import type { ReactElement, ReactNode } from 'react';
import { JarDrawing, pickJarShape } from '../JarShelf';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { StockJarButton } from '../StockDialog';
import type { StockDialogProps } from '../StockDialog/types';
import { stockState } from '../StockBadge/stock-state';
import { amountText } from '../StockBadge/stock-words';
import { needOf, supplyOf } from './steps/supply';
import type { SpellStepValue } from './steps/types';
import { verdictOf, type VerdictKind, VerdictMark } from './verdict-mark';
import { isInstruction, stepNameOf } from './steps/values';

// In Coven Inventory: one line per form, at its first step's place, setting `needOf` against the jar's `supplyOf`, with a `VerdictMark` and `doorsOf` doors; used by the recipe page alone
// (claude-docs/components/spell-recipe.md, "The side column" and "Notes from code comments: the inventory panel").

// A one-off holds no stock, but its jar is drawn with something in it, as a stocked jar is: an
// unmeasured jar stands at the middling level, in muted ink (index.scss). The One-Off badge says
// why.
const ONE_OFF_HELD = { quantity: null, threshold: null };

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
  const name = stepNameOf(step);
  const oneOff = step.ingredientId === null;
  const jar = step.jar;
  // The form only picks the vessel's shape here; it is not shown.
  const { form: formKey } = step;
  // A form with no jar is drawn as the shelf draws one, dashed.
  const state = jar ? stockState(jar.quantity, jar.threshold) : 'empty';
  const modifier = oneOff || state === 'ok' ? '' : `jar-shelf__jar--${state}`;
  return (
    <li className={`spell-inventory__line${oneOff ? ' is-one-off' : ''}`}>
      <span className={`spell-inventory__jar ${modifier}`}>
        <JarDrawing shape={pickJarShape(seed, formKey ?? '')} held={oneOff ? ONE_OFF_HELD : jar} />
      </span>
      <span className="spell-inventory__title">
        {doors?.edit ? (
          // The button is the name, stretched over the jar by its `::after`; the eye and the
          // verdict are raised above the stretch to keep their own press.
          <StockJarButton
            {...doors.edit}
            ariaLabel={['Edit Stock', doors.edit.ingredientName, step.form && formLabel(step.form)]
              .filter(Boolean)
              .join(', ')}
            className="spell-inventory__press"
          >
            <span className="spell-inventory__name">{name}</span>
          </StockJarButton>
        ) : (
          <span className="spell-inventory__name">{name}</span>
        )}
      </span>
      {/* The eye in a column of its own at the line's right, so it stands in one place down the
          list whatever the name's length. */}
      {doors?.look && <span className="spell-inventory__look">{doors.look}</span>}
      <span className="spell-inventory__words">
        {/* The verdict's mark opens the words it is about: the need and the have. */}
        {verdict && <VerdictMark kind={verdict} />}
        <span>{parts.join(' · ')}</span>
      </span>
    </li>
  );
}

export function InCovenInventory({
  steps,
  doorsOf,
}: {
  steps: readonly SpellStepValue[];
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
    <section className="spell-inventory" aria-labelledby="spell-inventory-heading">
      <h2 id="spell-inventory-heading">In Coven Inventory</h2>
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
