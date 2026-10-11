import Link from 'next/link';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import type { GroupKind } from '../GroupForm/types';
import Pager from '../Pager';
import { TABLE_ROLES } from './roles';
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

/** The table's name, the page's heading: what a screen reader lists it as. */
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
  <div className="list-frame">
    {groups.length ? (
      <div className="data-table-frame">
        <table
          className="data-table data-table--stack group-list__table"
          {...TABLE_ROLES.table}
          aria-label={TABLE_NAME[kind]}
        >
          <thead {...TABLE_ROLES.rowgroup}>
            <tr {...TABLE_ROLES.row}>
              <th scope="col" {...TABLE_ROLES.columnheader}>
                Name
              </th>
              <th scope="col" {...TABLE_ROLES.columnheader}>
                Description
              </th>
              <th scope="col" {...TABLE_ROLES.columnheader}>
                <span className="visually-hidden">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody {...TABLE_ROLES.rowgroup}>
            {groups.map((group) => (
              <tr key={group.id} {...TABLE_ROLES.row}>
                <td {...TABLE_ROLES.cell} data-label="Name">
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
                <td
                  {...TABLE_ROLES.cell}
                  data-label="Description"
                  className="group-list__description"
                >
                  {group.description}
                </td>
                <td {...TABLE_ROLES.cell} data-label="">
                  {/* Soft navigation: the page renders again with the modal open. */}
                  <Link className="btn btn--small btn--quiet" href={group.editHref}>
                    Edit <span className="visually-hidden">{group.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p>{kind === 'tradition' ? 'No traditions yet.' : 'No groups yet.'}</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
  </div>
);

export default GroupList;
