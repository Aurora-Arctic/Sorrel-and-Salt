import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import type { GroupKind } from '../GroupForm/types';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { stackCell, tableRole } from '../../lib/table-roles';
import GroupListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupListFilter as Filter, GroupListProps } from './types';
import './index.scss';

// A group page's table and pager (M5.6b), for every group vocabulary, a deity's
// traditions included (MB.132).
// Render-only: the page reads one page of groups through the service and hands
// it here. A category group's name is drawn in its own chip, which is how a
// reader meets the pair. A name search heads the list for a kind whose page
// hands it a `filter`: the traditions', thirty-five in the seed (MB.115), and
// not the category or form groups', eight and six. Each Edit is an address —
// the page opens its modal from the URL — so a modal can be linked to and
// Back closes it. The table turns each row into a card at phone width
// (claude-docs/components/group-list.md).

/**
 * What an empty list says: how to fill it, with the page header's Add, named
 * as that button is (`group-page.tsx`); or, searched with no rows, what to
 * change, as a value list's does.
 */
function emptyMessage(kind: GroupKind, filter: Filter | undefined): string {
  const { noun, plural, add } = KINDS[kind];
  return filter?.query
    ? `No ${noun} matches that filter. Try another name.`
    : `There are no ${plural} yet. Add one with ${add}.`;
}

const GroupList = ({
  kind,
  groups,
  previousHref,
  nextHref,
  position,
  filter,
}: GroupListProps): ReactElement => (
  <ListFrame>
    {/* Keyed by the search shown, so another one starts the form again from it. */}
    {filter && <GroupListFilter key={filter.query} kind={kind} filter={filter} />}

    <ListBody>
      {groups.length ? (
        <div className="data-table-frame">
          <table
            className="data-table data-table--stack group-list__table"
            {...tableRole('table')}
            aria-label={KINDS[kind].title}
          >
            <thead {...tableRole('rowgroup')}>
              <tr {...tableRole('row')}>
                <th scope="col" {...tableRole('columnheader')}>
                  Name
                </th>
                <th scope="col" {...tableRole('columnheader')}>
                  Description
                </th>
                <th scope="col" {...tableRole('columnheader')}>
                  <span className="visually-hidden">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody {...tableRole('rowgroup')}>
              {groups.map((group) => (
                <tr key={group.id} {...tableRole('row')}>
                  <td {...stackCell('Name')}>
                    {kind === 'category' && group.colorDark && group.colorLight ? (
                      <span
                        className="chip"
                        style={chipColors({
                          colorDark: group.colorDark,
                          colorLight: group.colorLight,
                        })}
                      >
                        {group.name}
                      </span>
                    ) : (
                      group.name
                    )}
                  </td>
                  <td {...stackCell('Description')} className="group-list__description">
                    {group.description}
                  </td>
                  <td className="data-table__card-action" {...stackCell('')}>
                    <EditLink href={group.editHref} name={group.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>{emptyMessage(kind, filter)}</p>
      )}

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default GroupList;
