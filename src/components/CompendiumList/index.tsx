import { EditLink } from '../IconTip';
import { Fragment, type ReactElement } from 'react';
import FormIcon from '../FormIcon';
import StackTable, { updatedColumn } from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { noMatchText } from '../../lib/text';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS, labelOf } from '../IngredientForm/options';
import IngredientSearch from '../IngredientSearch';
import CompendiumListFilter from './filter';
import type {
  CompendiumCategoryChoice,
  CompendiumListEntry,
  CompendiumListFilter as Filter,
  CompendiumListProps,
} from './types';
import './index.scss';

// `/admin/compendium`'s filter, table and pager (M5.5), as the category
// list's. Render-only: the page reads one page of the compendium under the
// address's filter through the service and hands it here. The filter is a GET
// form to the page itself, so a filtered page — the unknown kind, the
// unsourced — is an address. Each Edit is an address too, the page opening its
// modal from the URL, so a modal can be linked to and Back closes it. The
// frame, filter row and pager are IngredientSearch's (M8.10); this list gives
// it the filter and the table (claude-docs/components/compendium-list.md).

// None, rather than an empty cell: the to-do list tells an unconfirmed formal
// name from no formal name by this column.
const NONE = '—';

/** The columns; Edit's pencil stands at a card's top right on a phone. */
const COLUMNS: readonly StackColumn<CompendiumListEntry>[] = [
  { heading: 'Name', cell: (entry) => entry.name },
  { heading: 'Formal Name', cell: (entry) => entry.canonicalName ?? NONE },
  {
    heading: 'Classification',
    cell: (entry) => labelOf(NOMENCLATURE_OPTIONS, entry.nomenclature),
  },
  {
    heading: 'Form',
    // Each form led by its group's icon, the generic where it has none, the
    // two held together as one unit that never wraps apart: the icon close
    // to its name and the next form farther off (the owner's call,
    // 2026-10-16). The forms sit in one wrapping row whose gap sets them
    // apart, so a form that wraps starts its line at the cell's edge. The
    // comma stays, on the name before it, so a screen reader hears a list; the
    // space between two forms draws nothing in a flex row, and keeps the
    // cell's name reading "Herb, Oil" and not "Herb,Oil".
    cell: (entry) =>
      entry.forms.length ? (
        <span className="compendium-list__forms">
          {entry.forms.map(({ name, icon }, i) => (
            <Fragment key={name}>
              {i > 0 && ' '}
              <span className="compendium-list__form">
                <FormIcon name={icon} />
                {i < entry.forms.length - 1 ? `${name},` : name}
              </span>
            </Fragment>
          ))}
        </span>
      ) : (
        NONE
      ),
  },
  updatedColumn(),
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    // Named with the formal name too, as two entries can share a label but
    // never a formal name.
    cell: (entry) => (
      <EditLink
        href={entry.editHref}
        heading={entry.editHeading}
        name={entry.canonicalName ? `${entry.name}, ${entry.canonicalName}` : entry.name}
      />
    ),
  },
];

/**
 * The empty list, naming the filters in use (MB.115, on the owner's call), so
 * an admin sees what to change: "No entries match “wort”, the form “Oil” and
 * the classification Botanical. Change or clear the filter to see more." With no
 * filter, the compendium itself is empty, and says how to begin it.
 */
function emptyText(
  { query, form, nomenclature, withoutReferences, elements, categories }: Filter,
  known: readonly CompendiumCategoryChoice[],
): string {
  // By name, the ones the page knows; a slug it does not is not filtering anything.
  const named = categories.flatMap((slug) => known.find((each) => each.slug === slug)?.name ?? []);
  const filters = [
    query && `“${query}”`,
    form && `the form “${form}”`,
    nomenclature && `the classification ${labelOf(NOMENCLATURE_OPTIONS, nomenclature)}`,
    withoutReferences && 'No Refs',
    elements.length > 0 &&
      `the ${elements.length === 1 ? 'element' : 'elements'} ${elements.map((each) => labelOf(ELEMENT_OPTIONS, each)).join(' or ')}`,
    named.length > 0 &&
      `the ${named.length === 1 ? 'category' : 'categories'} ${named.join(' and ')}`,
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText(
    'entries',
    filters,
    'The compendium is empty. Add the first entry with Add Ingredient.',
  );
}

const CompendiumList = ({
  entries,
  filter,
  forms,
  categories,
  previousHref,
  nextHref,
  position,
}: CompendiumListProps): ReactElement => (
  <IngredientSearch
    search={
      // Keyed by the filter shown, so another one starts the form again from
      // it; but not by its categories, which the picker follows itself, so a
      // pick does not draw the picker afresh and lose its announcement.
      <CompendiumListFilter
        key={JSON.stringify({ ...filter, categories: [] })}
        filter={filter}
        forms={forms}
        categories={categories}
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
      empty={emptyText(filter, categories)}
    />
  </IngredientSearch>
);

export default CompendiumList;
