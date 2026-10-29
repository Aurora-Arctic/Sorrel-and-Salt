import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import { emptyText } from '../CompendiumList';
import { CompendiumEditLink } from '../IconTip';
import IngredientCard from '../IngredientCard';
import { cardName } from '../IngredientCard/card-name';
import IngredientCardList from '../IngredientCardList';
import DetailsLink from '../IngredientEntry/details-link';
import IngredientSearch from '../IngredientSearch';
import AddIcon from '../AddIcon';
import CompendiumCardMore from './card-more';
import { HeldMark } from './held-mark';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
// The empty sentence (`emptyText`, `.compendium-list__empty`) and the filter are CompendiumList's
// own, so its stylesheet comes with them; the cards have no stylesheet of their own.
import '../CompendiumList/index.scss';

// The public compendium's list: the filter row, a grid of cards and the pager. Render-only: the page
// reads one page under the address's filter. A card's foot is the plus or the check, a curator's Edit
// in Compendium, then the three dots (`card-more.tsx`); a visitor sees none (claude-docs/components/compendium-cards.md).

const entryHref = ({ slug }: CompendiumCardEntry) => `/compendium/ingredients/${slug}` as Route;

// Named with the formal name too, as two entries can share a name.
const nameOf = (entry: CompendiumCardEntry): string => cardName(entry.name, entry.canonicalName);

// The foot's add mark: the plus while some coven the viewer may write in lacks the entry, the
// check once every one holds it. Both need a default coven.
const markOf = (
  entry: CompendiumCardEntry,
  action: CompendiumCardsProps['action'],
  workspaceId: string | undefined,
  covens: CompendiumCardsProps['covens'],
): ReactElement | undefined => {
  if (action !== 'add' || !workspaceId) return undefined;
  if (!entry.held)
    return (
      <AddIcon
        name={nameOf(entry)}
        workspaceId={workspaceId}
        ingredientId={entry.id}
        covens={covens ?? []}
        heldIn={entry.heldIn ?? []}
        holding={entry.holding}
      />
    );
  return <HeldMark name={nameOf(entry)} holding={entry.holding} />;
};

// A curator's Edit in Compendium, where the page gave the entry an edit address.
// Named for the compendium it changes, so it is not taken for a coven's own.
const editOf = (entry: CompendiumCardEntry): ReactElement | undefined =>
  entry.editHref && entry.editHeading ? (
    <CompendiumEditLink
      href={entry.editHref}
      heading={entry.editHeading}
      name={nameOf(entry)}
      className="icon-tip__edit icon-tip__edit--ink"
    />
  ) : undefined;

// The three dots, where a coven that holds the entry lets the viewer do something about it.
const moreOf = (entry: CompendiumCardEntry): ReactElement | undefined =>
  entry.places && entry.places.length > 0 ? (
    <CompendiumCardMore
      id={entry.id}
      label={entry.name}
      name={nameOf(entry)}
      places={entry.places}
    />
  ) : undefined;

// The foot, up to three icons in this order: the add mark, Edit in Compendium, then
// the three dots. Nothing for someone with none of them.
const footOf = (
  entry: CompendiumCardEntry,
  action: CompendiumCardsProps['action'],
  workspaceId: string | undefined,
  covens: CompendiumCardsProps['covens'],
): ReactElement | undefined => {
  const mark = markOf(entry, action, workspaceId, covens);
  const edit = editOf(entry);
  const more = moreOf(entry);
  return mark || edit || more ? (
    <>
      {mark}
      {edit}
      {more}
    </>
  ) : undefined;
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
  cursor,
  action,
  workspaceId,
  covens,
  myCovens,
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
        covens={myCovens}
        cursor={cursor}
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
            actions={footOf(entry, action, workspaceId, covens)}
            startActions={
              // The Quick Look eye at the card's bottom left, for everyone.
              entry.details && <DetailsLink opens={entry.details} name={nameOf(entry)} />
            }
          />
        ))}
      </IngredientCardList>
    )}
  </IngredientSearch>
);

export default CompendiumCards;
