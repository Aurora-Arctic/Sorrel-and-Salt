import type { ReactElement } from 'react';
import BackLink from '../IngredientEntry/back-link';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { UNTITLED_SPELL } from '../SpellCard';
import SpellRecipeBody from './body';
import type { SpellRecipeProps } from './types';

// A saved spell as a page (MB.6): what it is for, its four facts, then its steps in
// order, then its note (those are `SpellRecipeBody`, which the Quick Look modal draws too, M13.21). Read-only: Edit is the `action` slot's, for a role that may update
// the spell (M13.10), and there is no Delete. Presentational: the page reads through the
// service and hands the values here. The steps are drawn here, read-only, until M13.3's
// StepRow can be shown without a form around it. The page is the only view M10.22 styles for
// print, so nothing here sets print rules. claude-docs/components/spell-recipe.md.

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
}: SpellRecipeProps): ReactElement => {
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  return (
    <article
      className={`spell-recipe${aside ? ' spell-recipe--with-aside' : ''}`}
      aria-labelledby="spell-recipe-title"
    >
      {/* The ingredient entry's own back link (the owner, 2026-10-29): the chevron, and the
          way back through history to the list as it was, the Drafts tab counted as the list. */}
      <BackLink className="spell-recipe__back" href={back.href} also={[`${back.href}/drafts`]}>
        Back to {back.label} <LinkHint />
      </BackLink>
      {/* Above the title, as the ingredient entry page places it (the owner, 2026-10-29). */}
      {lastEdit && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
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
      <div className="spell-recipe__columns">
        <div className="spell-recipe__main">
          <SpellRecipeBody
            title={title}
            intent={intent}
            categories={categories}
            note={note}
            steps={steps}
            jarDescription={jarDescription}
            sealWaxColor={sealWaxColor}
            moonPhase={moonPhase}
            dayOfWeek={dayOfWeek}
          />
        </div>
        {/* Named: an aside inside an article is a landmark only with a name. */}
        {aside && (
          <aside className="spell-recipe__aside" aria-label="The Jar">
            {aside}
          </aside>
        )}
      </div>
    </article>
  );
};

export default SpellRecipe;
export type { SpellRecipeProps, RecipeStep } from './types';
