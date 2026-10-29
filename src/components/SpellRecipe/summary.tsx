import type { ReactElement } from 'react';
import { amountOf } from '../StepRow';
import { labelOf } from './body';
import type { RecipeStep } from './types';

// The Ingredients summary: the ingredient steps in order with their amounts, to gather from
// before starting. Drawn for print alone (`_print.scss` hides it on screen, where the steps carry
// the amounts and the side column holds the stock): nobody reads paper beside the jar by hunting
// through the steps (M10.22). A formal name shows where two steps share a label, as in the steps.

const SpellRecipeSummary = ({ steps }: { steps: readonly RecipeStep[] }): ReactElement | null => {
  const lines = steps.flatMap((step) => (step.kind === 'ingredient' ? [step] : []));
  if (lines.length === 0) return null;
  return (
    <section className="spell-recipe__summary">
      <h2>Ingredients</h2>
      <ul aria-label="Ingredients">
        {lines.map((step) => (
          <li key={step.id}>
            {amountOf(step.quantity, step.unit)} {labelOf(step)}
            {step.formal !== null && <span> ({step.formal})</span>}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SpellRecipeSummary;
