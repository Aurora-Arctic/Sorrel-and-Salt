import type { ReactElement } from 'react';
import BackLink from '../IngredientEntry/back-link';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { UNTITLED_SPELL } from '../SpellCard';
import SpellMarks from '../SpellMarks';
import PageNav from '../PageNav';
import type { PageNavEntry } from '../PageNav/types';
import SpellRecipeBody from './body';
import SpellRecipeSummary from './summary';
import { CATEGORY_MATCH_ID, INVENTORY_ID, JAR_ID, STEPS_ID, WORKINGS_ID } from './sections';
import type { SpellRecipeProps } from './types';

// A saved spell as a page: purpose, four facts, steps, note (`SpellRecipeBody`, which Quick Look
// also draws). Read-only; the page's controls (Record, Edit, Preview, the three dots) are the
// `action` slot's, for the roles that may. Its print
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
  // One entry per section drawn, so none links to nothing.
  const entries: PageNavEntry[] = [
    ...(steps.length > 0 ? [{ href: `#${STEPS_ID}` as const, label: 'Steps' }] : []),
    // The jar stands beside the recipe from a tablet up, so the menu names its two sections only
    // where it is stacked.
    ...(aside
      ? [
          {
            href: `#${CATEGORY_MATCH_ID}` as const,
            label: 'Category Match',
            group: 'The Jar',
            narrowOnly: true,
          },
          {
            href: `#${INVENTORY_ID}` as const,
            label: 'In Coven Inventory',
            group: 'The Jar',
            narrowOnly: true,
          },
        ]
      : []),
    ...(workings ? [{ href: `#${WORKINGS_ID}` as const, label: 'Workings' }] : []),
  ];
  return (
    <article
      className={`spell-recipe${aside ? ' spell-recipe--with-aside' : ''}${entries.length > 0 ? ' spell-recipe--with-nav' : ''}`}
      aria-labelledby="spell-recipe-title"
    >
      <header className="spell-recipe__head">
        {/* The ingredient entry's own back link: the chevron, and the
            way back through history to the list as it was, the Drafts tab counted as the list. */}
        <BackLink className="spell-recipe__back" href={back.href} also={[`${back.href}/drafts`]}>
          Back to {back.label} <LinkHint />
        </BackLink>
        {/* Above the title, as the ingredient entry page places it. */}
        {lastEdit && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
        <h1 id="spell-recipe-title">{name}</h1>
        <SpellMarks status={status} visibility={visibility} />
        {action}
      </header>
      <SpellRecipeSummary steps={steps} />
      {entries.length > 0 && <PageNav label="On This Page" entries={entries} />}
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
          {workings}
        </div>
        {/* Named: an aside inside an article is a landmark only with a name. */}
        {aside && (
          <aside id={JAR_ID} className="spell-recipe__aside" aria-label="The Jar">
            {aside}
          </aside>
        )}
      </div>
    </article>
  );
};

export default SpellRecipe;
export type { SpellRecipeProps, RecipeStep } from './types';
