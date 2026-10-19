import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import { emptyText } from '../CompendiumList';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
import '../CompendiumList/index.scss';

// The public compendium's list (M8.18): the filter row, one card per entry in a grid, and
// the pager. Render-only, like the admin's table (CompendiumList): the page reads one page
// under the address's filter and hands it here. Each card is a plain link to the entry's
// page, no modal. The foot of a card holds Add to My Ingredients for someone who can add,
// which stays disabled until M9.12 builds its dialog (the owner's call, 2026-10-19). A visitor
// with no account sees no action on the cards and signs in through the header. claude-docs/components/compendium-cards.md.

const entryHref = ({ slug }: CompendiumCardEntry) => `/compendium/ingredients/${slug}` as Route;

const CompendiumCards = ({
  entries,
  filter,
  facets,
  categories,
  vocabulary,
  previousHref,
  nextHref,
  position,
  total,
  action,
}: CompendiumCardsProps): ReactElement => (
  <IngredientSearch
    shape="cards"
    search={
      <CompendiumListFilter
        audience="public"
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={vocabulary}
        total={total}
      />
    }
    previousHref={previousHref}
    nextHref={nextHref}
    position={position}
  >
    {entries.length === 0 ? (
      <p>{emptyText(filter, categories, facets, 'The compendium is empty.')}</p>
    ) : (
      <IngredientCardList label="Compendium">
        {entries.map((entry) => (
          <IngredientCard
            key={entry.id}
            href={entryHref(entry)}
            label={entry.name}
            formalName={entry.canonicalName}
            nomenclature={entry.nomenclature}
            categories={entry.categories}
            variants={entry.variants}
            toxic={entry.toxic}
            safetyNotes={entry.safetyNotes}
            kind="compendium"
            actions={
              action === 'add' ? (
                // Disabled until M9.12 builds the dialog it opens.
                <button type="button" className="btn btn--small" disabled>
                  Add to My Ingredients
                </button>
              ) : undefined
            }
          />
        ))}
      </IngredientCardList>
    )}
  </IngredientSearch>
);

export default CompendiumCards;
