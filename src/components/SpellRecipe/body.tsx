import type { ReactElement } from 'react';
import CategoryChips from '../CategoryChips';
import { QuickLookLink } from '../IconTip';
import { DETAILS_PLACE, detailsHeading } from '../IngredientEntry/details';
import StepRow from '../StepRow';
import OneOffBadge from '../StepRow/one-off-badge';
import MoonPhaseIcon from '../MoonPhaseIcon';
import { SafetyMark } from '../SafetyNote';
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

/**
 * The ingredient's name as plain text, not a link (the owner, 2026-10-28): the Quick Look eye
 * beside it opens the ingredient's details modal. The formal name follows where two share a label.
 */
const Name = ({ step }: { step: IngredientRecipeStep }): ReactElement => (
  <>
    <span>{labelOf(step)}</span>
    {step.formal !== null && <span className="meta spell-recipe__formal"> ({step.formal})</span>}
    {step.deleted && <span className="meta"> (Deleted)</span>}
    {step.look && (
      <>
        {' '}
        <QuickLookLink
          href={step.look.href}
          name={step.look.name}
          heading={detailsHeading(step.look)}
          place={DETAILS_PLACE}
        />
      </>
    )}
  </>
);

/** The step's marks, at the row's end: Toxic or Caution from the ingredient, and the builder's One-Off. */
const Marks = ({ step }: { step: IngredientRecipeStep }): ReactElement | null =>
  step.safety || step.oneOff ? (
    <span className="spell-recipe__marks">
      {step.safety && <SafetyMark {...step.safety} />}
      {/* The builder's One-Off badge, with its tip, so the two read alike. */}
      {step.oneOff && <OneOffBadge className="spell-recipe__one-off" />}
    </span>
  ) : null;

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
      <CategoryChips categories={categories} label={name} showAll />

      {facts.length > 0 && (
        <div className="spell-recipe__facts-box">
          <dl className="spell-recipe__facts">
            {facts.map(({ label, text }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {/* The builder's drawing beside the phase; a phase outside its list draws nothing. */}
                  {label === 'Moon Phase' && <MoonPhaseIcon phase={text} />}
                  {text}
                </dd>
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
                marks={<Marks step={step} />}
                quantity={step.quantity}
                unit={step.unit}
                // An ingredient step shows its note and not its text (the owner, 2026-10-28);
                // an instruction step is its text.
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
