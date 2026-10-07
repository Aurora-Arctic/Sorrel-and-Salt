import Link from 'next/link';
import type { ReactElement } from 'react';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import Pager from '../Pager';
import CompendiumListFilter from './filter';
import type { CompendiumListProps } from './types';
import './index.scss';

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

const CompendiumList = ({
  entries,
  filter,
  previousHref,
  nextHref,
  position,
}: CompendiumListProps): ReactElement => (
  <div className="compendium-list">
    {/* Keyed by the filter shown, so another one starts the form again from it. */}
    <CompendiumListFilter
      key={`${filter.query}\n${filter.nomenclature}\n${filter.withoutReferences}`}
      filter={filter}
    />

    {entries.length ? (
      <div className="data-table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Classification</th>
              <th scope="col">Formal Name</th>
              <th scope="col">Form</th>
              <th scope="col">
                <span className="visually-hidden">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.name}</td>
                <td>{KIND_LABELS.get(entry.nomenclature)}</td>
                <td>{entry.canonicalName ?? NONE}</td>
                <td>{entry.form ?? NONE}</td>
                <td>
                  {/* Soft navigation: the page renders again with the modal open.
                      Named with the form too, as two entries can share a name. */}
                  <Link className="btn btn--small btn--quiet" href={entry.editHref}>
                    Edit{' '}
                    <span className="visually-hidden">
                      {entry.form ? `${entry.name}, ${entry.form}` : entry.name}
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
