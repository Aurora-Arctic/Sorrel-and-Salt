import Link from 'next/link';
import type { ReactElement } from 'react';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import Pager from '../Pager';
import CompendiumListFilter from './filter';
import type { CompendiumListProps } from './types';

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

// Each part's own role, written out because the table stacks into cards at
// phone width (`.data-table--stack`), and WebKit drops a table's meaning once
// `display` changes on its parts (claude-docs/styling.md, "Tables at phone
// width"). Spread rather than written as `role="table"`, which lint refuses
// as redundant: it cannot know the stylesheet takes the implicit role away.
const ROLE = {
  table: { role: 'table' },
  rowgroup: { role: 'rowgroup' },
  row: { role: 'row' },
  columnheader: { role: 'columnheader' },
  cell: { role: 'cell' },
} as const;

const CompendiumList = ({
  entries,
  filter,
  previousHref,
  nextHref,
  position,
}: CompendiumListProps): ReactElement => (
  <div className="list-frame">
    {/* Keyed by the filter shown, so another one starts the form again from it. */}
    <CompendiumListFilter
      key={`${filter.query}\n${filter.nomenclature}\n${filter.withoutReferences}`}
      filter={filter}
    />

    {entries.length ? (
      <div className="data-table-frame">
        <table className="data-table data-table--stack" {...ROLE.table}>
          <thead {...ROLE.rowgroup}>
            <tr {...ROLE.row}>
              <th scope="col" {...ROLE.columnheader}>
                Name
              </th>
              <th scope="col" {...ROLE.columnheader}>
                Classification
              </th>
              <th scope="col" {...ROLE.columnheader}>
                Formal Name
              </th>
              <th scope="col" {...ROLE.columnheader}>
                Form
              </th>
              <th scope="col" {...ROLE.columnheader}>
                <span className="visually-hidden">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody {...ROLE.rowgroup}>
            {entries.map((entry) => (
              // Each cell names its column for the card it becomes; the Edit
              // cell's empty name spans the card without one.
              <tr key={entry.id} {...ROLE.row}>
                <td data-label="Name" {...ROLE.cell}>
                  {entry.name}
                </td>
                <td data-label="Classification" {...ROLE.cell}>
                  {KIND_LABELS.get(entry.nomenclature)}
                </td>
                <td data-label="Formal Name" {...ROLE.cell}>
                  {entry.canonicalName ?? NONE}
                </td>
                <td data-label="Form" {...ROLE.cell}>
                  {entry.forms.length ? entry.forms.join(', ') : NONE}
                </td>
                <td data-label="" {...ROLE.cell}>
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
      <p>
        {filter.query || filter.nomenclature || filter.withoutReferences
          ? 'No compendium entry matches.'
          : 'No compendium entries yet.'}
      </p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
  </div>
);

export default CompendiumList;
