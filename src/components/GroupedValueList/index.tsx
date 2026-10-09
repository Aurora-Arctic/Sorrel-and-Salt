import Link from 'next/link';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import Pager from '../Pager';
import GroupedValueListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupedValueListProps } from './types';
import './index.scss';

// A grouped curated vocabulary's filter, table and pager — `/admin/categories`'
// (M5.6, MB.178) and `/admin/forms`' (M5.6a) — one for every such vocabulary,
// as GroupList is for their groups (MB.132). Render-only: the page reads one
// page of the vocabulary under the address's filter through the service and
// hands it here. The filter is a GET form to the page itself, so a filtered
// page is an address. Each Edit is an address — the page opens its modal from
// the URL, as it does for the Add beside its heading — so a modal can be
// linked to and Back closes it (claude-docs/components/grouped-value-list.md).

const GroupedValueList = ({
  kind,
  values,
  filter,
  groups,
  previousHref,
  nextHref,
  position,
}: GroupedValueListProps): ReactElement => {
  const { noun, plural, groupLabel } = KINDS[kind];
  return (
    // The kind's modifier, so a rule one kind's rows need — the category
    // chip's padding — stays that kind's.
    <div className={`grouped-value-list grouped-value-list--${kind}`}>
      {/* Keyed by the filter shown, so another one starts the form again from it. */}
      <GroupedValueListFilter
        key={`${filter.query}\n${filter.group}`}
        kind={kind}
        filter={filter}
        groups={groups}
      />

      {values.length ? (
        <div className="data-table-frame">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">{groupLabel}</th>
                <th scope="col">Description</th>
                <th scope="col">
                  <span className="visually-hidden">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {values.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>
                    {/* The group in its own chip, as the category picker shows it. */}
                    {entry.groupColors ? (
                      <span className="chip" style={chipColors(entry.groupColors)}>
                        {entry.groupName}
                      </span>
                    ) : (
                      entry.groupName
                    )}
                  </td>
                  <td className="grouped-value-list__description">{entry.description}</td>
                  <td>
                    {/* Soft navigation: the page renders again with the modal open. */}
                    <Link className="btn btn--small btn--quiet" href={entry.editHref}>
                      Edit <span className="visually-hidden">{entry.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>{filter.query || filter.group ? `No ${noun} matches.` : `No ${plural} yet.`}</p>
      )}

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </div>
  );
};

export default GroupedValueList;
