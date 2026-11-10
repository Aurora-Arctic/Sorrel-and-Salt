import { compendiumEntryPath } from '@/lib/compendium-path';
import { PendingLink } from '../../lib/navigation';
import DetailsLink from '../IngredientEntry/details-link';
import { EditLink } from '../IconTip';
import ShownToggle from '../IngredientEntry/shown-toggle';
import { cardName } from '../IngredientCard/card-name';
import { LinkIconHint } from '../LinkHint';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import CategoryChips from '../CategoryChips';
import FormIcon from '../FormIcon';
import StackTable, { updatedColumn } from '../DataTable';
import type { ColumnSort, OtherOrder, SortDirection, StackColumn } from '../DataTable/types';
import { NO_MATCH_ADVICE, emptyList, noMatchLead } from '../../lib/text';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS, labelOf } from '../IngredientForm/options';
import { CompendiumListBodySkeleton } from './skeleton';
import IngredientSearch from '../IngredientSearch';
import { facetChoices, vocabulariesOf } from './facets';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import CompendiumListFilter from './filter';
import { compendiumHref } from './href';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumListEntry,
  CompendiumListFilter as Filter,
  CompendiumListProps,
} from './types';
import './index.scss';

// `/curator/compendium`'s filter, table and pager. Render-only: the page reads one page under the
// address's filter, and each Edit is an address, so a modal can be linked to and Back closes it
// (claude-docs/components/compendium-list.md).

// None, rather than an empty cell: the to-do list tells an unconfirmed formal
// name from no formal name by this column.
const NONE = '—';

// Named with the formal name too, as two entries can share a label but never
// a formal name: Edit and Quick Look read it after their verb.
const nameOf = (entry: CompendiumListEntry): string => cardName(entry.name, entry.canonicalName);

const directionOf = (filter: Filter): SortDirection =>
  filter.order === 'desc' ? 'descending' : 'ascending';

/**
 * Name's sort, A to Z first. With no search the list is by name already, so its A to Z address writes no sort; under a search
 * the default is Best Match, so A to Z names the sort to override it.
 */
function nameSort(filter: Filter): ColumnSort {
  const byDefault = !filter.sort && !filter.query;
  return {
    current: filter.sort === 'name' ? directionOf(filter) : byDefault ? 'ascending' : undefined,
    href: {
      ascending: compendiumHref({ ...filter, sort: filter.query ? 'name' : '', order: '' }),
      descending: compendiumHref({ ...filter, sort: 'name', order: 'desc' }),
    },
    labels: { ascending: 'A to Z', descending: 'Z to A' },
  };
}

/** The sourcing score's sort, lowest first, so the worst-sourced entries come to the top. */
const scoreSort = (filter: Filter): ColumnSort => ({
  current: filter.sort === 'sourcing_score' ? directionOf(filter) : undefined,
  href: {
    ascending: compendiumHref({ ...filter, sort: 'sourcing_score', order: '' }),
    descending: compendiumHref({ ...filter, sort: 'sourcing_score', order: 'desc' }),
  },
  labels: { ascending: 'Lowest First', descending: 'Highest First' },
});

const bestMatch = (filter: Filter): OtherOrder[] =>
  filter.query
    ? [
        {
          label: 'Best Match',
          href: compendiumHref({ ...filter, sort: '', order: '' }),
          current: !filter.sort,
        },
      ]
    : [];

const columnsFor = (filter: Filter): readonly StackColumn<CompendiumListEntry>[] => [
  {
    heading: 'Name',
    sort: nameSort(filter),
    cell: (entry) => (
      <>
        <DetailsLink opens={entry.details} name={nameOf(entry)} />{' '}
        <PendingLink className="compendium-list__name" href={compendiumEntryPath(entry.slug)}>
          {entry.name}
          <LinkIconHint />
        </PendingLink>
      </>
    ),
  },
  { heading: 'Formal Name', cell: (entry) => entry.canonicalName ?? NONE },
  {
    heading: 'Classification',
    cell: (entry) => labelOf(NOMENCLATURE_OPTIONS, entry.nomenclature),
  },
  {
    heading: 'Form',
    // Each form led by its group's icon (the generic where none), the two held as one unit that never wraps
    // apart. The `dotted-row` mixin draws a dot between forms; the spoken comma ends a form before it and a
    // space parts the two, so the cell reads "Herb, Oil" and a screen reader hears a list.
    cell: (entry) =>
      entry.forms.length ? (
        <span className="compendium-list__forms">
          {entry.forms.map(({ name, icon }, i) => (
            <Fragment key={name}>
              {i > 0 && ' '}
              <span className="compendium-list__item">
                <span className="compendium-list__form">
                  <FormIcon name={icon} />
                  {/* The comma inside the label's inline span, not a flex child: Chrome
                      sets a flex child apart with spaces, which read "Herb , Oil". */}
                  <span>
                    {formLabel(name)}
                    {i < entry.forms.length - 1 && <span className="spoken-separator">,</span>}
                  </span>
                </span>
              </span>
            </Fragment>
          ))}
        </span>
      ) : (
        NONE
      ),
  },
  {
    heading: 'Categories',
    className: 'compendium-list__categories',
    headingClassName: 'compendium-list__categories',
    cell: (entry) =>
      entry.categories.length ? (
        <CategoryChips categories={entry.categories} label={entry.name} compact />
      ) : (
        NONE
      ),
  },
  {
    heading: 'Sourcing Score',
    sort: scoreSort(filter),
    cell: (entry) => entry.sourcingScore ?? NONE,
  },
  updatedColumn(),
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    className: 'compendium-list__edit',
    headingClassName: 'compendium-list__edit',
    cell: (entry) => (
      <>
        <EditLink href={entry.editHref} heading={entry.editHeading} name={nameOf(entry)} />
        <ShownToggle ingredientId={entry.id} shown={entry.shown} name={nameOf(entry)} />
      </>
    ),
  },
];

const value = (text: string): ReactNode => <strong>{text}</strong>;

const andNodes = (items: readonly ReactNode[]): ReactNode =>
  items.map((item, index) => (
    <Fragment key={index}>
      {index === 0 ? null : index === items.length - 1 ? ' and ' : ', '}
      {item}
    </Fragment>
  ));

const orValues = (values: readonly string[]): ReactNode =>
  values.map((each, index) => (
    <Fragment key={index}>
      {index === 0 ? null : ' or '}
      {value(`“${each}”`)}
    </Fragment>
  ));

const joinedNames = (names: readonly string[], word: string): ReactNode =>
  names.map((each, index) => (
    <Fragment key={index}>
      {index === 0 ? null : word}
      {value(each)}
    </Fragment>
  ));

export function emptyText(
  {
    query,
    forms,
    deities,
    zodiac,
    celestialBodies,
    toxic,
    withoutReferences,
    withoutForms,
    hidden,
    elements,
    categories,
    categoryMode,
  }: Filter,
  known: readonly CompendiumCategoryChoice[],
  facets: CompendiumFacetCounts,
  whenEmpty = `${emptyList('ingredients')} Add the first with Add Ingredient.`,
): ReactElement {
  const deityNames = deities.flatMap((slug) => {
    const deity = facets.deities.find(({ value }) => value === slug);
    return deity ? `${deity.label} (${deity.tradition})` : [];
  });
  const toxicLabel = facets.toxic.find(({ value }) => value === toxic)?.label;
  const named = categories.flatMap((slug) => known.find((each) => each.slug === slug)?.name ?? []);
  const filters = [
    query && value(`“${query}”`),
    forms.length > 0 && (
      <>
        the {forms.length === 1 ? 'form' : 'forms'} {orValues(forms)}
      </>
    ),
    deityNames.length > 0 && (
      <>
        the {deityNames.length === 1 ? 'deity' : 'deities'} {orValues(deityNames)}
      </>
    ),
    zodiac.length > 0 && (
      <>
        the {zodiac.length === 1 ? 'sign' : 'signs'} {orValues(zodiac)}
      </>
    ),
    celestialBodies.length > 0 && (
      <>
        the {celestialBodies.length === 1 ? 'celestial body' : 'celestial bodies'}{' '}
        {orValues(celestialBodies)}
      </>
    ),
    toxicLabel && <>the toxic setting {value(toxicLabel)}</>,
    withoutReferences && value('No Refs'),
    withoutForms && value('No Form'),
    hidden && value('Hidden'),
    elements.length > 0 && (
      <>
        the {elements.length === 1 ? 'element' : 'elements'}{' '}
        {joinedNames(
          elements.map((each) => labelOf(ELEMENT_OPTIONS, each)),
          ' or ',
        )}
      </>
    ),
    named.length > 0 && (
      <>
        the {named.length === 1 ? 'category' : 'categories'}{' '}
        {joinedNames(named, categoryMode === 'any' ? ' or ' : ' and ')}
      </>
    ),
  ].filter((filter): filter is Exclude<typeof filter, false | '' | undefined> => Boolean(filter));
  return (
    <span className="compendium-list__empty">
      {filters.length ? (
        <>
          {noMatchLead('entries')}
          {andNodes(filters)}
          {NO_MATCH_ADVICE}
        </>
      ) : (
        whenEmpty
      )}
    </span>
  );
}

const CompendiumList = ({
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
}: CompendiumListProps): ReactElement => {
  const matched = buildSearchSentence({
    filter: {
      ...filter,
      toxic: filter.toxic || null,
      reviewed: filter.reviewed || null,
      source: null,
      inStock: false,
      lowStockOnly: false,
    },
    total: 0,
    admin: true,
  }).hasFilter;
  return (
    <IngredientSearch
      skeleton={<CompendiumListBodySkeleton />}
      search={
        // Not keyed here: the row inside is keyed by the name searched, and follows the
        // rest of the filter itself, so a facet's change keeps the open panel and its
        // focus, and the sentence above the results keeps its typing across a search.
        <CompendiumListFilter
          filter={filter}
          counts={counts}
          categories={categories}
          vocabulary={vocabulary}
          total={total}
          cursor={cursor}
        />
      }
      previousHref={previousHref}
      nextHref={nextHref}
      position={position}
    >
      <StackTable
        columns={columnsFor(filter)}
        otherOrders={bestMatch(filter)}
        rows={entries}
        rowKey={(entry) => entry.id}
        empty={emptyText(
          filter,
          categories,
          facetChoices(counts, vocabulariesOf(categories, vocabulary)),
        )}
        emptyLabel={matched ? 'No Matches' : undefined}
        emptyAction={
          matched ? (
            <PendingLink href={compendiumHref({})} className="btn btn--quiet">
              Clear Filters
            </PendingLink>
          ) : undefined
        }
        className="data-table--nowrap"
      />
    </IngredientSearch>
  );
};

export default CompendiumList;
