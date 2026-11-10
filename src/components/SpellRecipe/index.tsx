import type { ReactElement } from 'react';
import BackLink from '../IngredientEntry/back-link';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { UNTITLED_SPELL } from '../SpellCard';
import SpellMarks from '../SpellMarks';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import { SpellRecipeLead, SpellRecipeRest } from './body';
import SpellRecipeSummary from './summary';
import { JAR_ID, recipeMenu } from './sections';
import type { SpellRecipeProps } from './types';

// A saved spell as a page, read-only; the page's controls are the `action` slot's, for the roles that may. Its print
// layout is `src/scss/_print.scss` (claude-docs/components/spell-recipe.md).

const SpellRecipe = ({
  title,
  intent,
  status,
  visibility,
  categories,
  lastEdit,
  note,
  steps,
  jarDescription,
  sealWaxColor,
  moonPhase,
  dayOfWeek,
  back,
  action,
  aside,
  workings,
}: SpellRecipeProps): ReactElement => {
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  // The side column's lines carry the Quick Look eyes, so a step names its ingredient plainly; the
  // Quick Look modal, which has no side column, keeps the eye on its steps.
  const plain = steps.map((step) => (step.kind === 'ingredient' ? { ...step, look: null } : step));
  const entries = recipeMenu({
    steps: steps.length > 0,
    aside: Boolean(aside),
    workings: Boolean(workings),
  });
  return (
    <article
      className={`spell-recipe${aside ? ' spell-recipe--with-aside' : ''}${entries.length > 0 ? ' spell-recipe--with-nav' : ''}`}
      aria-labelledby="spell-recipe-title"
    >
      <header className="spell-recipe__head">
        {/* The ingredient entry's own back link: the chevron, and the
            way back through history to the list as it was, the Drafts tab counted as the list. */}
        <div className="back-bar spell-recipe__bar">
          <BackLink
            href={back.href}
            label={back.label}
            also={[{ path: `${back.href}/drafts`, label: back.label }]}
          >
            <LinkHint />
          </BackLink>
        </div>
        {/* Above the title, as the ingredient entry page places it. */}
        {lastEdit && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
        <PageHeader
          id="spell-recipe-title"
          title={name}
          action={
            <>
              <SpellMarks status={status} visibility={visibility} />
              {action}
            </>
          }
        />
      </header>
      <SpellRecipeSummary steps={steps} />
      {/* The menu after the purpose and the chips in the source, as it stands on a phone, so the
          keyboard and a screen reader meet them in the order they are seen. */}
      <SpellRecipeLead title={title} intent={intent} categories={categories} />
      {entries.length > 0 && <PageNav label="On This Page" entries={entries} />}
      <div className="spell-recipe__columns">
        <div className="spell-recipe__main">
          <SpellRecipeRest
            note={note}
            steps={plain}
            jarDescription={jarDescription}
            sealWaxColor={sealWaxColor}
            moonPhase={moonPhase}
            dayOfWeek={dayOfWeek}
          />
          {/* Named: an aside inside an article is a landmark only with a name. Between the body and
              Workings in the source, as it stands below a tablet and as the menu lists it. */}
          {aside && (
            <aside id={JAR_ID} className="spell-recipe__aside" aria-label="The Cupboard">
              {aside}
            </aside>
          )}
          {workings}
        </div>
      </div>
    </article>
  );
};

export default SpellRecipe;
export type { SpellRecipeProps, RecipeStep } from './types';
