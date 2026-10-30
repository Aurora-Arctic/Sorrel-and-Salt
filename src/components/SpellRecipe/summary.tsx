import type { ReactElement } from 'react';
import type { Unit } from '@/modules/ingredients/schema/units';
import { needOf } from '../SpellBuilder/steps/supply';
import { labelOf } from './body';
import type { IngredientRecipeStep, RecipeStep } from './types';

// The Ingredients summary: one line per form, at its first step's place, with the total the steps
// need (`needOf`, as In Coven Inventory adds them), to gather from before starting. Drawn for
// print alone (`_print.scss` hides it on screen, where the side column holds the same): stock marks
// and buttons are left out. A formal name shows where two ingredients share a label, as in the steps.

// A stored amount reads "2.000"; the summary writes "2", as the steps do.
const plain = (quantity: string | null): string =>
  quantity === null || !Number.isFinite(Number(quantity))
    ? (quantity ?? '')
    : String(Number(quantity));

const SpellRecipeSummary = ({ steps }: { steps: readonly RecipeStep[] }): ReactElement | null => {
  const laid = steps.filter((step): step is IngredientRecipeStep => step.kind === 'ingredient');
  const lines = laid.filter(
    (step, index) =>
      step.variantId === null || laid.findIndex((o) => o.variantId === step.variantId) === index,
  );
  if (lines.length === 0) return null;
  return (
    <section className="spell-recipe__summary">
      <h2>Ingredients</h2>
      <ul aria-label="Ingredients">
        {lines.map((step) => {
          const same =
            step.variantId === null ? [step] : laid.filter((o) => o.variantId === step.variantId);
          const need = needOf(
            same.map((o) => ({ quantity: plain(o.quantity), unit: o.unit ?? '' })),
            // Mixed units of one dimension add up in the first step's unit; crossing dimensions, or a count, stay listed.
            (same[0]!.unit || null) as Unit | null,
          );
          return (
            <li key={step.id}>
              {need !== null && `${need} `}
              {labelOf(step)}
              {step.formal !== null && <span> ({step.formal})</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SpellRecipeSummary;
