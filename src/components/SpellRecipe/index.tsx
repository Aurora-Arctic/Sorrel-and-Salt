import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { formLabel } from '../../modules/ingredients/validation/form-label';
import { UNTITLED_SPELL } from '../SpellCard';
import type { IngredientRecipeStep, RecipeStep, SpellRecipeProps } from './types';
import './index.scss';

// A saved spell as a page (MB.6): what it is for, the ingredients it uses, then its steps in
// order, then its note. Read-only: Edit is the `action` slot's, for a role that may update
// the spell (M13.10), and there is no Delete. Presentational: the page reads through the
// service and hands the values here. The steps are drawn here, read-only, until M13.3's
// StepRow can be shown without a form around it. The page is the only view M10.22 styles for
// print, so nothing here sets print rules. claude-docs/components/spell-recipe.md.

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

const SpellRecipe = ({
  title,
  intent,
  status,
  visibility,
  categories,
  lastEdit,
  note,
  steps,
  back,
  action,
}: SpellRecipeProps): ReactElement => {
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  const purpose = (intent ?? '').trim();
  const ingredients = steps.filter(
    (step): step is IngredientRecipeStep => step.kind === 'ingredient',
  );
  const text = (note ?? '').trim();
  return (
    <article className="spell-recipe" aria-labelledby="spell-recipe-title">
      <PendingLink className="spell-recipe__back" href={back.href}>
        Back to {back.label} <LinkHint />
      </PendingLink>
      <header className="spell-recipe__head">
        <h1 id="spell-recipe-title">{name}</h1>
        {(status === 'draft' || visibility === 'private') && (
          <div className="specimen__badges">
            {status === 'draft' && <span className="badge badge--draft">Draft</span>}
            {visibility === 'private' && <span className="badge badge--private">Private</span>}
          </div>
        )}
        {action}
      </header>
      {lastEdit && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
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
    </article>
  );
};

export default SpellRecipe;
export type { SpellRecipeProps, RecipeStep } from './types';
