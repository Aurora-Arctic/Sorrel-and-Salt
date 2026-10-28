import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import StepRow from '../StepRow';
import LinkHint from '../LinkHint';
import { formLabel } from '../../modules/ingredients/validation/form-label';
import { UNTITLED_SPELL } from '../SpellCard';
import type { IngredientRecipeStep, RecipeStep, SpellRecipeBodyProps } from './types';
import './index.scss';

// What a saved spell says, below its head (MB.6, M13.21): its intent, categories, a strip of
// its four facts, its steps in order and its note. The recipe page and the grimoire's Quick
// Look modal both draw it, so the two cannot drift. A fragment, so the page's own column
// (or the modal's) lays its sections out. claude-docs/components/spell-recipe.md.

/** The ingredient's label as a step says it: "Testwort (Dried Leaf)". */
const labelOf = ({ name, form }: IngredientRecipeStep): string =>
  form ? `${name} (${formLabel(form)})` : name;

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
  jarDescription,
  sealWaxColor,
  moonPhase,
  dayOfWeek,
}: SpellRecipeBodyProps): ReactElement => {
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  const purpose = (intent ?? '').trim();
  const facts = (
    [
      ['Jar', jarDescription],
      ['Seal Wax', sealWaxColor],
      ['Moon Phase', moonPhase],
      ['Day', dayOfWeek],
    ] as const
  ).flatMap(([label, value]) => {
    const shown = (value ?? '').trim();
    return shown === '' ? [] : [{ label, text: shown }];
  });
  const text = (note ?? '').trim();
  return (
    <>
      {purpose !== '' && <p className="spell-recipe__intent">{purpose}</p>}
      <CategoryChips categories={categories} label={name} />

      {facts.length > 0 && (
        <div className="spell-recipe__facts-box">
          <dl className="spell-recipe__facts">
            {facts.map(({ label, text }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {steps.length === 0 ? (
        <p className="meta">This spell has no steps yet.</p>
      ) : (
        <ol className="spell-recipe__steps" aria-label="Steps">
          {steps.map((step: RecipeStep, i) =>
            step.kind === 'instruction' ? (
              <StepRow
                key={step.id}
                className="spell-recipe__instruction"
                position={i + 1}
                name={null}
                body={step.body}
              />
            ) : (
              <StepRow
                key={step.id}
                position={i + 1}
                name={<Name step={step} />}
                quantity={step.quantity}
                unit={step.unit}
                body={step.body}
                note={step.note && <p className="meta">{step.note}</p>}
              />
            ),
          )}
        </ol>
      )}

      {text !== '' && <p className="spell-recipe__note">{text}</p>}
    </>
  );
};

export default SpellRecipeBody;
