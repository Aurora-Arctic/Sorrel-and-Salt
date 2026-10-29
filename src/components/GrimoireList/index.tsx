import type { ReactElement } from 'react';
import IngredientSearch from '../IngredientSearch';
import SpellCard, { SpellCardFilters, spellTitleId } from '../SpellCard';
import { recipeHref } from './recipe-href';
import EmptyGrimoire from './empty';
import GrimoireFilter from './filter';
import type { GrimoireListProps } from './types';
import '../CompendiumList/index.scss';
import '../IngredientCardList/index.scss';
import './index.scss';

// One tab (Spells or Drafts) of a coven's Grimoire list: the filter row, a card per spell and the pager,
// on the coven Ingredients' list shell (CovenCards). Render-only; drawn here so each item takes its
// spell's title as its name (claude-docs/components/grimoire-list.md).

const GrimoireList = ({
  path,
  workspaceId,
  covenSlug,
  status,
  spells,
  filter,
  categories,
  facets,
  position,
  cursor,
  total,
  previousHref,
  nextHref,
}: GrimoireListProps): ReactElement => (
  <IngredientSearch
    shape="cards"
    search={
      <GrimoireFilter
        path={path}
        workspaceId={workspaceId}
        status={status}
        filter={filter}
        categories={categories}
        facets={facets}
        cursor={cursor}
        total={total}
      />
    }
    previousHref={previousHref}
    nextHref={nextHref}
    position={position}
  >
    {spells.length === 0 ? (
      <EmptyGrimoire status={status} filter={filter} />
    ) : (
      <>
        <SpellCardFilters />
        <ul
          className="ingredient-card-list grimoire-list__cards"
          aria-label="Grimoire"
          data-density="compact"
        >
          {spells.map((spell) => (
            <li key={spell.id} aria-labelledby={spellTitleId(spell.id)}>
              <SpellCard {...spell} href={recipeHref(covenSlug, spell.id)} />
            </li>
          ))}
        </ul>
      </>
    )}
  </IngredientSearch>
);

export default GrimoireList;
