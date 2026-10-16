import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import StackTable, { updatedColumn } from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { noMatchText } from '../../lib/text';
import { NOMENCLATURE_OPTIONS, labelOf } from '../IngredientForm/options';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import CompendiumListFilter from './filter';
import type {
  CompendiumListEntry,
  CompendiumListFilter as Filter,
  CompendiumListProps,
} from './types';

// `/admin/compendium`'s filter, table and pager (M5.5), as the category
// list's. Render-only: the page reads one page of the compendium under the
// address's filter through the service and hands it here. The filter is a GET
// form to the page itself, so a filtered page — the unknown kind, the
// unsourced — is an address. Each Edit is an address too, the page opening its
// modal from the URL, so a modal can be linked to and Back closes it
// (claude-docs/components/compendium-list.md).

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
  { heading: 'Form', cell: (entry) => (entry.forms.length ? entry.forms.join(', ') : NONE) },
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
function emptyText({ query, form, nomenclature, withoutReferences }: Filter): string {
  const filters = [
    query && `“${query}”`,
    form && `the form “${form}”`,
    nomenclature && `the classification ${labelOf(NOMENCLATURE_OPTIONS, nomenclature)}`,
    withoutReferences && 'No Refs',
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
  previousHref,
  nextHref,
  position,
}: CompendiumListProps): ReactElement => (
  <ListFrame>
    {/* Keyed by the filter shown, so another one starts the form again from it. */}
    <CompendiumListFilter
      key={`${filter.query}\n${filter.form}\n${filter.nomenclature}\n${filter.withoutReferences}`}
      filter={filter}
      forms={forms}
    />

    <ListBody>
      <StackTable
        columns={COLUMNS}
        rows={entries}
        rowKey={(entry) => entry.id}
        empty={emptyText(filter)}
      />

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default CompendiumList;
