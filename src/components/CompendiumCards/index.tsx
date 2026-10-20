import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import { emptyText } from '../CompendiumList';
import { EditLink } from '../IconTip';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import DetailsLink from '../IngredientEntry/details-link';
import IngredientSearch from '../IngredientSearch';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
import '../CompendiumList/index.scss';

// The public compendium's list (M8.18): the filter row, one card per entry in a grid, and
// the pager. Render-only, like the admin's table (CompendiumList): the page reads one page
// under the address's filter and hands it here. Each card is a plain link to the entry's
// page. The foot of a card holds Add to My Ingredients for someone who can add,
// which stays disabled until M9.12 builds its dialog (the owner's call, 2026-10-19), and, for
// a curator, Edit, which opens the compendium's edit dialog over the results (M8.17). A visitor
// with no account sees no action on the cards and signs in through the header. claude-docs/components/compendium-cards.md.

const entryHref = ({ slug }: CompendiumCardEntry) => `/compendium/ingredients/${slug}` as Route;

// Named with the formal name too, as two entries can share a name.
const nameOf = (entry: CompendiumCardEntry): string =>
  entry.canonicalName ? `${entry.name}, ${entry.canonicalName}` : entry.name;

// The foot: Add to My Ingredients for someone who can add, and a curator's Edit where the
// page gave the entry an edit address (M8.17).
const actionsOf = (
  entry: CompendiumCardEntry,
  action: CompendiumCardsProps['action'],
): ReactElement | undefined => {
  const add = action === 'add' && (
    // Disabled until M9.12 builds the dialog it opens.
    <button type="button" className="btn btn--small" disabled>
      Add to My Ingredients
    </button>
  );
  const edit = entry.editHref && entry.editHeading && (
    <EditLink href={entry.editHref} heading={entry.editHeading} name={nameOf(entry)} />
  );
  if (!add && !edit) return undefined;
  return (
    <>
      {add}
      {edit}
    </>
  );
};

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
            recency={entry.recency}
            actions={actionsOf(entry, action)}
            startActions={
              // The Quick Look eye at the card's bottom left (M12.5), for everyone.
              entry.details && <DetailsLink opens={entry.details} name={nameOf(entry)} />
            }
          />
        ))}
      </IngredientCardList>
    )}
  </IngredientSearch>
);

export default CompendiumCards;
