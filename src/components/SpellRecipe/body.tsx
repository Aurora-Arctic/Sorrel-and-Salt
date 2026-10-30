import type { ReactElement, ReactNode } from 'react';
import CategoryChips from '../CategoryChips';
import { QuickLookLink } from '../IconTip';
import { DETAILS_PLACE, detailsHeading } from '../IngredientEntry/details';
import StepRow from '../StepRow';
import OneOffBadge from '../StepRow/one-off-badge';
import MoonPhaseIcon from '../MoonPhaseIcon';
import { SafetyMark } from '../SafetyNote';
import { formLabel } from '../../modules/ingredients/validation/form-label';
import { UNTITLED_SPELL } from '../SpellCard';
import { VerdictMark } from '../SpellBuilder/verdict-mark';
import { STEPS_ID, STEPS_TITLE_ID } from './sections';
import type {
  IngredientRecipeStep,
  RecipeHeadingLevel,
  RecipeStep,
  SpellRecipeBodyProps,
} from './types';
import './index.scss';

// What a saved spell says, below its head: its intent, categories, a strip of
// its four facts, its steps in order and its note. The recipe page and the grimoire's Quick
// Look modal both draw it, so the two cannot drift. A fragment, so the page's own column
// (or the modal's) lays its sections out. claude-docs/components/spell-recipe.md.

/** The ingredient's label as a step says it: "Testwort (Dried Leaf)". */
export const labelOf = ({ name, form }: IngredientRecipeStep): string =>
  form ? `${name} (${formLabel(form)})` : name;

/**
 * The ingredient's name as plain text, not a link: the Quick Look eye
 * beside it opens the ingredient's details modal. The formal name follows where two share a label.
 */
const Name = ({ step }: { step: IngredientRecipeStep }): ReactElement => (
  <>
    <span>{labelOf(step)}</span>
    {step.formal !== null && <span className="meta"> ({step.formal})</span>}
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

/**
 * The step's marks, at the row's end: Toxic or Caution from the ingredient, the coven's stock
 * verdict where the recipe carries one (the Quick Look), and the builder's One-Off.
 */
const Marks = ({ step }: { step: IngredientRecipeStep }): ReactElement | null =>
  step.safety || step.supply || step.oneOff ? (
    <span className="spell-recipe__marks">
      {step.safety && <SafetyMark {...step.safety} />}
      {step.supply && <VerdictMark kind={step.supply} />}
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
  beforeSteps,
  level = 2,
}: SpellRecipeBodyProps & {
  /** A section between the facts and the steps; the Preview pane puts the Ingredients summary here. */
  beforeSteps?: ReactNode;
  /** The Steps heading's level, one below the heading the body sits under. Defaults to 2. */
  level?: RecipeHeadingLevel;
}): ReactElement => {
  const Heading = level === 3 ? 'h3' : 'h2';
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
      {/* Two boxes, so the recipe page can stand its side column level with the facts strip,
          beside the second box and not the first. The lead is left out
          when it holds nothing, so the column then starts at the top. */}
      {(purpose !== '' || categories.length > 0) && (
        <div className="spell-recipe__lead">
          {purpose !== '' && <p className="spell-recipe__intent">{purpose}</p>}
          <CategoryChips categories={categories} label={name} showAll />
        </div>
      )}

      <div className="spell-recipe__rest">
        {facts.length > 0 && (
          <div className="spell-recipe__facts-box">
            <dl className="spell-recipe__facts">
              {facts.map(({ label, text }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className={label === 'Moon Phase' ? 'spell-recipe__moon' : undefined}>
                    {/* The builder's drawing beside the phase; a phase outside its list draws nothing. */}
                    {label === 'Moon Phase' && <MoonPhaseIcon phase={text} />}
                    {text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {beforeSteps}

        {/* The steps under their heading, the Ingredients summary's twin: shown where the summary is,
            on paper and in the Preview pane, and on screen read only by a screen reader. */}
        <section className="spell-recipe__steps-section">
          <Heading id={STEPS_TITLE_ID}>Steps</Heading>
          {steps.length === 0 ? (
            <p className="meta">This spell has no steps yet.</p>
          ) : (
            <ol id={STEPS_ID} className="spell-recipe__steps" aria-labelledby={STEPS_TITLE_ID}>
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
                    // An ingredient step's line is its body, drawn muted under the name. An
                    // instruction step is its text.
                    note={step.body && <p className="meta">{step.body}</p>}
                  />
                ),
              )}
            </ol>
          )}
        </section>

        {text !== '' && <p className="spell-recipe__note">{text}</p>}
      </div>
    </>
  );
};

export default SpellRecipeBody;
