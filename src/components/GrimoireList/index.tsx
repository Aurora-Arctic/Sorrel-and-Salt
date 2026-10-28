import type { ReactElement } from 'react';
import IngredientSearch from '../IngredientSearch';
import SpellCard, { SpellCardFilters, spellTitleId } from '../SpellCard';
import EmptyGrimoire from './empty';
import GrimoireFilter from './filter';
import type { GrimoireListProps } from './types';
import '../CompendiumList/index.scss';
import '../IngredientCardList/index.scss';
import './index.scss';

// A coven's Grimoire list (M10.11), one tab of it, Spells or Drafts: the filter row, one card
// per spell, and the pager, on the same list shell as the coven's Ingredients (CovenCards).
// Render-only: the page reads one page and hands it here. The list is drawn here rather than
// by IngredientCardList so that each item takes its spell's title as its name. An empty tab
// is EmptyGrimoire's. claude-docs/components/grimoire-list.md.

const GrimoireList = ({
  path,
  workspaceId,
  status,
  spells,
  filter,
  categories,
  position,
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
          data-density="regular"
        >
          {spells.map((spell) => (
            <li key={spell.id} aria-labelledby={spellTitleId(spell.id)}>
              <SpellCard {...spell} />
            </li>
          ))}
        </ul>
      </>
    )}
  </IngredientSearch>
);

export default GrimoireList;
