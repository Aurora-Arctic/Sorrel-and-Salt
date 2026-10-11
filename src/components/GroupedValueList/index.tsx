import Link from 'next/link';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { stackCell, tableRole } from '../../lib/table-roles';
import Pager from '../Pager';
import GroupedValueListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupedValueListProps } from './types';
import './index.scss';

// A curated vocabulary's filter, table and pager: grouped — `/admin/categories`'
// (M5.6, MB.178), `/admin/forms`' (M5.6a) and `/admin/deities`' (MB.132) — or
// flat, with no group column or group filter, `/admin/planets`' and
// `/admin/zodiac-signs`' (MB.95, folded in at MB.115). One for every such
// vocabulary, as GroupList is for their groups. Render-only: the page reads
// one page of the vocabulary under the address's filter through the service
// and hands it here. The filter is a GET form to the page itself, so a
// filtered page is an address. Each Edit is an address — the page opens its
// modal from the URL, as it does for the Add beside its heading — so a modal
// can be linked to and Back closes it. On a phone the table turns into cards
// (claude-docs/components/grouped-value-list.md).

const GroupedValueList = ({
  kind,
  values,
  filter,
  groups = [],
  previousHref,
  nextHref,
  position,
}: GroupedValueListProps): ReactElement => {
  const { title, noun, plural, group } = KINDS[kind];
  return (
    // The kind's modifier, so a rule one kind's rows need — the category
    // chip's padding — stays that kind's.
    <div className={`list-frame grouped-value-list--${kind}`}>
      {/* Keyed by the filter shown, so another one starts the form again from it. */}
      <GroupedValueListFilter
        key={`${filter.query}\n${filter.group}`}
        kind={kind}
        filter={filter}
        groups={groups}
      />

      {values.length ? (
        <div className="data-table-frame">
          <table
            className="data-table data-table--stack"
            aria-label={title}
            {...tableRole('table')}
          >
            <thead {...tableRole('rowgroup')}>
              <tr {...tableRole('row')}>
                <th scope="col" {...tableRole('columnheader')}>
                  Name
                </th>
                {group && (
                  <th scope="col" {...tableRole('columnheader')}>
                    {group.label}
                  </th>
                )}
                <th scope="col" {...tableRole('columnheader')}>
                  Description
                </th>
                <th scope="col" {...tableRole('columnheader')}>
                  <span className="visually-hidden">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody {...tableRole('rowgroup')}>
              {values.map((entry) => (
                <tr key={entry.id} {...tableRole('row')}>
                  <td {...stackCell('Name')}>{entry.name}</td>
                  {group && (
                    <td {...stackCell(group.label)}>
                      {/* The group in its own chip, as the category picker shows it. */}
                      {entry.groupColors ? (
                        <span className="chip" style={chipColors(entry.groupColors)}>
                          {entry.groupName}
                        </span>
                      ) : (
                        entry.groupName
                      )}
                    </td>
                  )}
                  <td className="grouped-value-list__description" {...stackCell('Description')}>
                    {entry.description}
                  </td>
                  {/* No label: an action spans its card on a phone. */}
                  <td {...stackCell('')}>
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
