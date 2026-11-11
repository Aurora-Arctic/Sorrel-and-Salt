import type { ReactElement } from 'react';
import CategoryChips from '../CategoryChips';
import { QuickLookLink } from '../IconTip';
import { DETAILS_PLACE, detailsHeading } from '../IngredientEntry/details';
import StepRow from '../StepRow';
import OneOffBadge from '../StepRow/one-off-badge';
import MoonPhaseIcon from '../MoonPhaseIcon';
import { SafetyMark } from '../SafetyNote';
import { formLabel } from '../../modules/ingredients/validation/form-label';
import { spellNameOf } from '../SpellCard/untitled';
import { VerdictMark } from '../SpellBuilder/verdict-mark';
import { STEPS_ID, STEPS_TITLE_ID } from './sections';
import type {
  IngredientRecipeStep,
  RecipeStep,
  SpellRecipeLeadProps,
  SpellRecipeRestProps,
} from './types';
import './index.scss';

// What a saved spell says below its head. The recipe page, the grimoire's Quick Look and the Preview pane all draw it,
// so they cannot drift (claude-docs/components/spell-recipe.md).

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

const Marks = ({ step }: { step: IngredientRecipeStep }): ReactElement | null =>
  step.safety || step.supply || step.oneOff ? (
    <span className="spell-recipe__marks">
      {step.safety && <SafetyMark {...step.safety} />}
      {step.supply && <VerdictMark kind={step.supply} />}
      {/* The builder's One-Off badge, with its tip, so the two read alike. */}
      {step.oneOff && <OneOffBadge className="spell-recipe__one-off" />}
    </span>
  ) : null;

/**
 * The purpose and the chips. The recipe page draws it apart from the rest, ahead of its jump menu,
 * so the spell says what it is for before the menu is reached. Nothing when it holds nothing.
 */
export const SpellRecipeLead = ({
  title,
  intent,
  categories,
}: SpellRecipeLeadProps): ReactElement | null => {
  const name = spellNameOf(title);
  const purpose = (intent ?? '').trim();
  return purpose !== '' || categories.length > 0 ? (
    <div className="spell-recipe__lead">
      {purpose !== '' && <p className="spell-recipe__intent">{purpose}</p>}
      <CategoryChips categories={categories} label={name} showAll />
    </div>
  ) : null;
};

export const SpellRecipeRest = ({
  note,
  steps,
  jarDescription,
  sealWaxColor,
  moonPhase,
  dayOfWeek,
  beforeSteps,
  level = 2,
}: SpellRecipeRestProps): ReactElement => {
  const Heading = level === 3 ? 'h3' : 'h2';
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
                  note={step.body && <p className="meta">{step.body}</p>}
                />
              ),
            )}
          </ol>
        )}
      </section>

      {text !== '' && <p className="spell-recipe__note">{text}</p>}
    </div>
  );
};

/**
 * Both boxes, as Quick Look and the Preview pane draw them: a fragment, so the caller's own
 * column lays the sections out.
 */
const SpellRecipeBody = ({
  title,
  intent,
  categories,
  ...rest
}: SpellRecipeLeadProps & SpellRecipeRestProps): ReactElement => (
  <>
    <SpellRecipeLead title={title} intent={intent} categories={categories} />
    <SpellRecipeRest {...rest} />
  </>
);

export default SpellRecipeBody;
