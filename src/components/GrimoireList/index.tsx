import type { ReactElement } from 'react';
import IngredientSearch from '../IngredientSearch';
import IngredientCardList from '../IngredientCardList';
import SpellCard, { SpellCardFilters } from '../SpellCard';
import { recipeHref } from './recipe-href';
import EmptyGrimoire from './empty';
import GrimoireFilter from './filter';
import type { GrimoireListProps } from './types';
import '../CompendiumList/index.scss';
import './index.scss';

// One tab (Spells or Drafts) of a coven's Grimoire list: the filter row, a card per spell and the pager,
// on the coven Ingredients' list shell (CovenCards), the list named after its tab. Render-only
// (claude-docs/components/grimoire-list.md). The wrapper's `data-density` draws the loading skeleton
// compact, as the cards are.

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
  <div data-density="compact">
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
          <IngredientCardList label={status === 'draft' ? 'Drafts' : 'Spells'} density="compact">
            {spells.map((spell) => (
              <SpellCard key={spell.id} {...spell} href={recipeHref(covenSlug, spell.id)} />
            ))}
          </IngredientCardList>
        </>
      )}
    </IngredientSearch>
  </div>
);

export default GrimoireList;
