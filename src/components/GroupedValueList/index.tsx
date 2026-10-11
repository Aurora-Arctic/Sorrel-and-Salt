import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { stackCell, tableRole } from '../../lib/table-roles';
import ListFrame, { ListBody } from '../ListFrame';
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
  const { title, label, noun, plural, group } = KINDS[kind];
  // An empty list says how to fill it; a filtered one with no rows, what to
  // change, naming what this kind can be filtered by.
  const empty =
    filter.query || filter.group
      ? `No ${noun} matches that filter. Try another name${group ? ` or ${group.label.toLowerCase()}` : ''}.`
      : `There are no ${plural} yet. Add one with Add ${label}.`;
  return (
    // The kind's modifier, so a rule one kind's rows need — the category
    // chip's padding — stays that kind's.
    <ListFrame className={`grouped-value-list--${kind}`}>
      {/* Keyed by the filter shown, so another one starts the form again from it. */}
      <GroupedValueListFilter
        key={`${filter.query}\n${filter.group}`}
        kind={kind}
        filter={filter}
        groups={groups}
      />

      <ListBody>
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
                    {/* No label: on a phone, the action stands at its card's top right. */}
                    <td className="data-table__card-action" {...stackCell('')}>
                      <EditLink href={entry.editHref} name={entry.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{empty}</p>
        )}

        <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
      </ListBody>
    </ListFrame>
  );
};

export default GroupedValueList;
