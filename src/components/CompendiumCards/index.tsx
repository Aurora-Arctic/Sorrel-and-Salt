import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import { emptyText } from '../CompendiumList';
import { facetChoices, vocabulariesOf } from '../CompendiumList/facets';
import EmptyState from '../EmptyState';
import { CompendiumEditLink } from '../IconTip';
import IngredientCard from '../IngredientCard';
import { CardCategoryVocabulary } from '../IngredientCard/category-vocabulary';
import { cardName } from '../IngredientCard/card-name';
import IngredientCardList from '../IngredientCardList';
import DetailsLink from '../IngredientEntry/details-link';
import { ListBodySkeleton } from '../ListFrame/skeleton';
import IngredientSearch from '../IngredientSearch';
import AddIcon from '../AddIcon';
import { emptyList } from '../../lib/text';
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

const nameOf = (entry: CompendiumCardEntry): string => cardName(entry.name, entry.canonicalName);

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

const moreOf = (entry: CompendiumCardEntry): ReactElement | undefined =>
  entry.places && entry.places.length > 0 ? (
    <CompendiumCardMore
      id={entry.id}
      label={entry.name}
      name={nameOf(entry)}
      places={entry.places}
    />
  ) : undefined;

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
  counts,
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
    skeleton={<ListBodySkeleton label="Compendium" card="compendium" />}
    search={
      <CompendiumListFilter
        audience="public"
        filter={filter}
        counts={counts}
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
      <EmptyState size="compact" label="No Ingredients">
        {emptyText(
          filter,
          categories,
          facetChoices(counts, vocabulariesOf(categories, vocabulary)),
          emptyList('ingredients'),
        )}
      </EmptyState>
    ) : (
      <CardCategoryVocabulary categories={categories}>
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
                entry.details && <DetailsLink opens={entry.details} name={nameOf(entry)} />
              }
            />
          ))}
        </IngredientCardList>
      </CardCategoryVocabulary>
    )}
  </IngredientSearch>
);

export default CompendiumCards;
