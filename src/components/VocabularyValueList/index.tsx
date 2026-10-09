import Link from 'next/link';
import type { ReactElement } from 'react';
import Pager from '../Pager';
import VocabularyValueListFilter from './filter';
import { VOCABULARY_COPY } from './vocabularies';
import type { VocabularyValueListProps } from './types';
import './index.scss';

// A flat curated vocabulary's filter, table and pager (MB.95): the planets'
// and the signs' admin pages, in GroupedValueList's shape without the
// group. Render-only: the page reads one page of the vocabulary under the
// address's query through the service and hands it here. Each Edit is an
// address — the page opens its modal from the URL — so a modal can be linked
// to and Back closes it (claude-docs/components/vocabulary-value-list.md).

const VocabularyValueList = ({
  vocabulary,
  values,
  query,
  previousHref,
  nextHref,
  position,
}: VocabularyValueListProps): ReactElement => {
  const { noun, plural } = VOCABULARY_COPY[vocabulary];
  return (
    <div className="vocabulary-value-list">
      {/* Keyed by the query shown, so another one starts the form again from it. */}
      <VocabularyValueListFilter key={query} vocabulary={vocabulary} query={query} />

      {values.length ? (
        <div className="data-table-frame">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">
                  <span className="visually-hidden">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {values.map((value) => (
                <tr key={value.id}>
                  <td>{value.name}</td>
                  <td className="vocabulary-value-list__description">{value.description}</td>
                  <td>
                    {/* Soft navigation: the page renders again with the modal open. */}
                    <Link className="btn btn--small btn--quiet" href={value.editHref}>
                      Edit <span className="visually-hidden">{value.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>{query ? `No ${noun} matches.` : `No ${plural} yet.`}</p>
      )}

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </div>
  );
};

export default VocabularyValueList;
