import type { ReactElement } from 'react';
import BackLink from '../IngredientEntry/back-link';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { UNTITLED_SPELL } from '../SpellCard';
import SpellRecipeBody from './body';
import type { SpellRecipeProps } from './types';

// A saved spell as a page: purpose, four facts, steps, note (`SpellRecipeBody`, which Quick Look
// also draws). Read-only; Edit and Delete Spell are the `action` slot's, for roles that may. No
// print rules are set here (claude-docs/components/spell-recipe.md).

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
      {/* The ingredient entry's own back link: the chevron, and the
          way back through history to the list as it was, the Drafts tab counted as the list. */}
      <BackLink className="spell-recipe__back" href={back.href} also={[`${back.href}/drafts`]}>
        Back to {back.label} <LinkHint />
      </BackLink>
      {/* Above the title, as the ingredient entry page places it. */}
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
