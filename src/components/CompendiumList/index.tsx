import type { Route } from 'next';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import DetailsLink from '../IngredientEntry/details-link';
import { EditLink } from '../IconTip';
import { cardName } from '../IngredientCard/card-name';
import { LinkIconHint } from '../LinkHint';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import CategoryChips from '../CategoryChips';
import FormIcon from '../FormIcon';
import StackTable, { updatedColumn } from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { NO_MATCH_ADVICE, emptyList, noMatchLead } from '../../lib/text';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS, labelOf } from '../IngredientForm/options';
import IngredientSearch from '../IngredientSearch';
import CompendiumListFilter from './filter';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumListEntry,
  CompendiumListFilter as Filter,
  CompendiumListProps,
} from './types';
import './index.scss';

// `/admin/compendium`'s filter, table and pager. Render-only: the page reads one page under the
// address's filter, and each Edit is an address, so a modal can be linked to and Back closes it
// (claude-docs/components/compendium-list.md).

// None, rather than an empty cell: the to-do list tells an unconfirmed formal
// name from no formal name by this column.
const NONE = '—';

// Named with the formal name too, as two entries can share a label but never
// a formal name: Edit and Quick Look read it after their verb.
const nameOf = (entry: CompendiumListEntry): string => cardName(entry.name, entry.canonicalName);

/** The columns; Edit's pencil stands at a card's top right on a phone. */
const COLUMNS: readonly StackColumn<CompendiumListEntry>[] = [
  {
    heading: 'Name',
    // The Quick Look eye opens the entry's details over the list, left of the name; then the entry's
    // public page by its stored slug, which offers a curator Edit. The pencil opens the edit modal here.
    cell: (entry) => (
      <>
        <DetailsLink opens={entry.details} name={nameOf(entry)} />{' '}
        <PendingLink
          className="compendium-list__name"
          href={`/compendium/ingredients/${entry.slug}` as Route}
          navigationTarget={ingredientLinkTarget(`/compendium/ingredients/${entry.slug}`)}
        >
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
    // The card's chips: the first two, the rest behind +N (CategoryChips).
    cell: (entry) =>
      entry.categories.length ? (
        <CategoryChips categories={entry.categories} label={entry.name} compact />
      ) : (
        NONE
      ),
  },
  updatedColumn(),
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    className: 'compendium-list__edit',
    headingClassName: 'compendium-list__edit',
    cell: (entry) => (
      <EditLink href={entry.editHref} heading={entry.editHeading} name={nameOf(entry)} />
    ),
  },
];

/** A filter's value, bold. The search sentence above boxes its values instead. */
const value = (text: string): ReactNode => <strong>{text}</strong>;

/** "A", "A and B", "A, B and C" over nodes: `joinAnd`'s rule, for parts that are not strings. */
const andNodes = (items: readonly ReactNode[]): ReactNode =>
  items.map((item, index) => (
    <Fragment key={index}>
      {index === 0 ? null : index === items.length - 1 ? ' and ' : ', '}
      {item}
    </Fragment>
  ));

/** Values joined by a word, each bold: “a” or “b”. */
const orValues = (values: readonly string[]): ReactNode =>
  values.map((each, index) => (
    <Fragment key={index}>
      {index === 0 ? null : ' or '}
      {value(`“${each}”`)}
    </Fragment>
  ));

/** Bold names after a joining word: Fire or Water. */
const joinedNames = (names: readonly string[], word: string): ReactNode =>
  names.map((each, index) => (
    <Fragment key={index}>
      {index === 0 ? null : word}
      {value(each)}
    </Fragment>
  ));

/**
 * The empty list, naming the filters in use ("No entries match “wort”, the form “Oil”…"), or, with none,
 * how to begin the compendium. A node, as the values are bold; `noMatchText` is the string form.
 */
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
    elements,
    categories,
    categoryMode,
  }: Filter,
  known: readonly CompendiumCategoryChoice[],
  facets: CompendiumFacetCounts,
  /** What an unfiltered empty list says: the admin's tells how to begin it. */
  whenEmpty = `${emptyList('ingredients')} Add the first with Add Ingredient.`,
): ReactElement {
  // A deity by its name and tradition, the pair that tells two of one name apart.
  const deityNames = deities.flatMap((slug) => {
    const deity = facets.deities.find(({ value }) => value === slug);
    return deity ? `${deity.label} (${deity.tradition})` : [];
  });
  const toxicLabel = facets.toxic.find(({ value }) => value === toxic)?.label;
  // By name, the ones the page knows; a slug it does not is not filtering anything.
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
  facets,
  categories,
  vocabulary,
  previousHref,
  nextHref,
  position,
  total,
  cursor,
}: CompendiumListProps): ReactElement => (
  <IngredientSearch
    search={
      // Not keyed here: the row inside is keyed by the name searched, and follows the
      // rest of the filter itself, so a facet's change keeps the open panel and its
      // focus, and the sentence above the results keeps its typing across a search.
      <CompendiumListFilter
        filter={filter}
        facets={facets}
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
      columns={COLUMNS}
      rows={entries}
      rowKey={(entry) => entry.id}
      empty={emptyText(filter, categories, facets)}
      className="data-table--nowrap"
    />
  </IngredientSearch>
);

export default CompendiumList;
