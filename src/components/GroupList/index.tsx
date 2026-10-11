import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import type { GroupKind } from '../GroupForm/types';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { stackCell, tableRole } from '../../lib/table-roles';
import type { GroupListProps } from './types';
import './index.scss';

// A group page's table and pager (M5.6b), for every group vocabulary, a deity's
// traditions included (MB.132).
// Render-only: the page reads one page of groups through the service and hands
// it here. A category group's name is drawn in its own chip, which is how a
// reader meets the pair. No filter: a vocabulary of eight sections, or six,
// needs none. Each Edit is an address — the page opens its modal from the URL
// — so a modal can be linked to and Back closes it. The table turns each row
// into a card at phone width (claude-docs/components/group-list.md).

/**
 * What an empty list says to do: add one with the page header's button,
 * named as that button is (`group-page.tsx`).
 */
const EMPTY: Record<GroupKind, string> = {
  category: 'There are no groups yet. Add one with Add Group.',
  form: 'There are no groups yet. Add one with Add Group.',
  tradition: 'There are no traditions yet. Add one with Add Tradition.',
};

/**
 * The table's name, what a screen reader lists it as: the full name its
 * tab's short label, "Groups" or "Traditions", stands for (MB.115).
 */
const TABLE_NAME: Record<GroupKind, string> = {
  category: 'Category Groups',
  form: 'Form Groups',
  tradition: 'Deity Traditions',
};

const GroupList = ({
  kind,
  groups,
  previousHref,
  nextHref,
  position,
}: GroupListProps): ReactElement => (
  <ListFrame>
    <ListBody>
      {groups.length ? (
        <div className="data-table-frame">
          <table
            className="data-table data-table--stack group-list__table"
            {...tableRole('table')}
            aria-label={TABLE_NAME[kind]}
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
                  <td {...stackCell('')}>
                    <EditLink href={group.editHref} name={group.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>{EMPTY[kind]}</p>
      )}

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default GroupList;
