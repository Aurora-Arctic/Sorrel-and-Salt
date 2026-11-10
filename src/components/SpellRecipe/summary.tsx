import type { ReactElement } from 'react';
import { plainQuantity } from '@/lib/quantity';
import type { Unit } from '@/modules/ingredients/schema/units';
import { needOf } from '../SpellBuilder/steps/supply';
import { labelOf } from './body';
import { SUMMARY_TITLE_ID } from './sections';
import type { IngredientRecipeStep, SpellRecipeSummaryProps } from './types';

const SpellRecipeSummary = ({ steps, level = 2 }: SpellRecipeSummaryProps): ReactElement | null => {
  const Heading = level === 3 ? 'h3' : 'h2';
  const laid = steps.filter((step): step is IngredientRecipeStep => step.kind === 'ingredient');
  const lines = laid.filter(
    (step, index) =>
      step.variantId === null || laid.findIndex((o) => o.variantId === step.variantId) === index,
  );
  if (lines.length === 0) return null;
  return (
    <section className="spell-recipe__summary">
      <Heading id={SUMMARY_TITLE_ID}>Ingredients</Heading>
      <ul aria-labelledby={SUMMARY_TITLE_ID}>
        {lines.map((step) => {
          const same =
            step.variantId === null ? [step] : laid.filter((o) => o.variantId === step.variantId);
          const need = needOf(
            same.map((o) => ({
              quantity: o.quantity === null ? '' : plainQuantity(o.quantity),
              unit: o.unit ?? '',
            })),
            (same[0]!.unit || null) as Unit | null,
          );
          return (
            <li key={step.id}>
              {/* Two cells, so print sets the amounts in one column and the names in another; a line with no amount keeps an empty first cell. */}
              <span className="spell-recipe__need">{need}</span>{' '}
              <span>
                {labelOf(step)}
                {step.formal !== null && <span> ({step.formal})</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SpellRecipeSummary;
