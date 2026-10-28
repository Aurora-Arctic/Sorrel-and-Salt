import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import LinkHint from '../LinkHint';
import { formLabel } from '../../modules/ingredients/validation/form-label';
import { UNTITLED_SPELL } from '../SpellCard';
import type { IngredientRecipeStep, RecipeStep, SpellRecipeBodyProps } from './types';

// What a saved spell says, below its head (MB.6, M13.21): its intent, categories, the
// ingredients it uses, its steps in order and its note. The recipe page and the grimoire's Quick
// Look modal both draw it, so the two cannot drift. A fragment, so the page's own column
// (or the modal's) lays its sections out. claude-docs/components/spell-recipe.md.

/** The ingredient's label as a step says it: "Testwort (Dried Leaf)". */
const labelOf = ({ name, form }: IngredientRecipeStep): string =>
  form ? `${name} (${formLabel(form)})` : name;

const amountOf = ({ quantity, unit }: IngredientRecipeStep): string | null =>
  quantity === null ? null : unit ? `${quantity} ${unit}` : quantity;

/** The ingredient's name: a link to its page where it has one, with its formal name beside it where two share a label. */
const Name = ({ step }: { step: IngredientRecipeStep }): ReactElement => (
  <>
    {step.href ? (
      <PendingLink href={step.href} navigationTarget={ingredientLinkTarget(step.href)}>
        {labelOf(step)} <LinkHint />
      </PendingLink>
    ) : (
      <span>{labelOf(step)}</span>
    )}
    {step.formal !== null && <span className="meta spell-recipe__formal"> ({step.formal})</span>}
    {step.oneOff && <span className="badge spell-recipe__one-off"> One-Off</span>}
    {step.deleted && <span className="meta"> (Deleted)</span>}
  </>
);

const SpellRecipeBody = ({
  title,
  intent,
  categories,
  note,
  steps,
}: SpellRecipeBodyProps): ReactElement => {
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  const purpose = (intent ?? '').trim();
  const ingredients = steps.filter(
    (step): step is IngredientRecipeStep => step.kind === 'ingredient',
  );
  const text = (note ?? '').trim();
  return (
    <>
      {purpose !== '' && <p className="spell-recipe__intent">{purpose}</p>}
      <CategoryChips categories={categories} label={name} />

      {ingredients.length > 0 && (
        <section aria-labelledby="spell-recipe-ingredients">
          <h2 id="spell-recipe-ingredients">Ingredients</h2>
          <ul className="spell-recipe__ingredients" aria-labelledby="spell-recipe-ingredients">
            {ingredients.map((step) => (
              <li key={step.id}>
                {amountOf(step) !== null && (
                  <span className="spell-recipe__amount">{amountOf(step)} </span>
                )}
                <Name step={step} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="spell-recipe-steps">
        <h2 id="spell-recipe-steps">Steps</h2>
        {steps.length === 0 ? (
          <p className="meta">This spell has no steps yet.</p>
        ) : (
          <ol className="spell-recipe__steps" aria-labelledby="spell-recipe-steps">
            {steps.map((step: RecipeStep) => (
              <li key={step.id}>
                {step.kind === 'instruction' ? (
                  <p>{step.body}</p>
                ) : (
                  <>
                    <p>
                      {amountOf(step) !== null && (
                        <span className="spell-recipe__amount">{amountOf(step)} </span>
                      )}
                      <Name step={step} />
                    </p>
                    {step.body && <p>{step.body}</p>}
                    {step.note && <p className="meta">{step.note}</p>}
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {text !== '' && (
        <section aria-labelledby="spell-recipe-note">
          <h2 id="spell-recipe-note">Note</h2>
          <p className="spell-recipe__note">{text}</p>
        </section>
      )}
    </>
  );
};

export default SpellRecipeBody;
