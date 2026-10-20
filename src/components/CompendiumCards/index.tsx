import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import { emptyText } from '../CompendiumList';
import { EditLink } from '../IconTip';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import { AddIcon, HeldLink } from './add-icon';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
import '../CompendiumList/index.scss';

// The public compendium's list (M8.18): the filter row, one card per entry in a grid, and
// the pager. Render-only, like the admin's table (CompendiumList): the page reads one page
// under the address's filter and hands it here. Each card is a plain link to the entry's
// page. A card's foot is one row at its bottom right: for someone who can add, the plus (Add
// to My Ingredients) or, once every coven they may write in holds the entry, the check (In My
// Ingredients); then, for a curator, Edit, which opens the compendium's edit dialog over the
// results (M8.17). The plus adds at once for one coven and opens a picker for several (M9.12, the
// owner's call, 2026-10-20). The foot's left end is the Quick Look eye's (M12.5). A visitor with
// no account sees nothing on the cards and signs in through the header.
// claude-docs/components/compendium-cards.md.

const entryHref = ({ slug }: CompendiumCardEntry) => `/compendium/ingredients/${slug}` as Route;

// Named with the formal name too, as two entries can share a name.
const nameOf = (entry: CompendiumCardEntry): string =>
  entry.canonicalName ? `${entry.name}, ${entry.canonicalName}` : entry.name;

// The foot's add mark: the plus while some coven the viewer may write in lacks the entry, the
// check once every one holds it. Both need a default coven; a held entry with no address to lead
// to shows neither.
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
        workspaceId={workspaceId}
        ingredientId={entry.id}
        covens={covens ?? []}
        heldIn={entry.heldIn ?? []}
      />
    );
  return entry.heldHref ? <HeldLink href={entry.heldHref} /> : undefined;
};

// A curator's Edit, where the page gave the entry an edit address (M8.17).
const editOf = (entry: CompendiumCardEntry): ReactElement | undefined =>
  entry.editHref && entry.editHeading ? (
    <EditLink href={entry.editHref} heading={entry.editHeading} name={nameOf(entry)} />
  ) : undefined;

// The foot: the add mark, then Edit. Nothing for someone with neither.
const footOf = (
  entry: CompendiumCardEntry,
  action: CompendiumCardsProps['action'],
  workspaceId: string | undefined,
  covens: CompendiumCardsProps['covens'],
): ReactElement | undefined => {
  const mark = markOf(entry, action, workspaceId, covens);
  const edit = editOf(entry);
  return mark || edit ? (
    <>
      {mark}
      {edit}
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
  action,
  workspaceId,
  covens,
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
            actions={footOf(entry, action, workspaceId, covens)}
          />
        ))}
      </IngredientCardList>
    )}
  </IngredientSearch>
);

export default CompendiumCards;
