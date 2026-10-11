import Link from 'next/link';
import type { ReactElement } from 'react';
import { stackCell, tableRole } from '../../lib/table-roles';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import Pager from '../Pager';
import CompendiumListFilter from './filter';
import type { CompendiumListFilter as Filter, CompendiumListProps } from './types';

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

/** Each kind by the label the filter and the form give it: Botanical, Unknown. */
const KIND_LABELS = new Map(NOMENCLATURE_OPTIONS.map(({ value, label }) => [value, label]));

/** A list as prose, without the serial comma: "a", "a and b", "a, b and c". */
function and(items: readonly string[]): string {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The empty list, naming the filters in use (MB.115, on the owner's call), so
 * an admin sees what to change: "No entry matches “wort”, the form “Oil” and
 * the classification Botanical. Change or clear the filter to see more." With no
 * filter, the compendium itself is empty, and says how to begin it.
 */
function emptyText({ query, form, nomenclature, withoutReferences }: Filter): string {
  const filters = [
    query && `“${query}”`,
    form && `the form “${form}”`,
    nomenclature && `the classification ${KIND_LABELS.get(nomenclature)}`,
    withoutReferences && 'Without References',
  ].filter((filter): filter is string => Boolean(filter));
  return filters.length
    ? `No entry matches ${and(filters)}. Change or clear the filter to see more.`
    : 'The compendium is empty. Add the first entry with Add Ingredient.';
}

const CompendiumList = ({
  entries,
  filter,
  forms,
  previousHref,
  nextHref,
  position,
}: CompendiumListProps): ReactElement => (
  <div className="list-frame">
    {/* Keyed by the filter shown, so another one starts the form again from it. */}
    <CompendiumListFilter
      key={`${filter.query}\n${filter.form}\n${filter.nomenclature}\n${filter.withoutReferences}`}
      filter={filter}
      forms={forms}
    />

    {entries.length ? (
      <div className="data-table-frame">
        <table className="data-table data-table--stack" {...tableRole('table')}>
          <thead {...tableRole('rowgroup')}>
            <tr {...tableRole('row')}>
              <th scope="col" {...tableRole('columnheader')}>
                Name
              </th>
              <th scope="col" {...tableRole('columnheader')}>
                Formal Name
              </th>
              <th scope="col" {...tableRole('columnheader')}>
                Classification
              </th>
              <th scope="col" {...tableRole('columnheader')}>
                Form
              </th>
              <th scope="col" {...tableRole('columnheader')}>
                <span className="visually-hidden">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody {...tableRole('rowgroup')}>
            {entries.map((entry) => (
              // Each cell names its column for the card it becomes; the Edit
              // cell's empty name spans the card without one.
              <tr key={entry.id} {...tableRole('row')}>
                <td {...stackCell('Name')}>{entry.name}</td>
                <td {...stackCell('Formal Name')}>{entry.canonicalName ?? NONE}</td>
                <td {...stackCell('Classification')}>{KIND_LABELS.get(entry.nomenclature)}</td>
                <td {...stackCell('Form')}>{entry.forms.length ? entry.forms.join(', ') : NONE}</td>
                <td {...stackCell('')}>
                  {/* Soft navigation: the page renders again with the modal open.
                      Named with the formal name too, as two entries can share a
                      label but never a formal name. */}
                  <Link className="btn btn--small btn--quiet" href={entry.editHref}>
                    Edit{' '}
                    <span className="visually-hidden">
                      {entry.canonicalName ? `${entry.name}, ${entry.canonicalName}` : entry.name}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p>{emptyText(filter)}</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
  </div>
);

export default CompendiumList;
