import Link from 'next/link';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import Pager from '../Pager';
import type { GroupListProps } from './types';
import './index.scss';

// A group page's table and pager (M5.6b), for both group vocabularies.
// Render-only: the page reads one page of groups through the service and hands
// it here. A category group's name is drawn in its own chip, which is how a
// reader meets the pair. No filter: a vocabulary of eight sections, or six,
// needs none. Each Edit is an address — the page opens its modal from the URL
// — so a modal can be linked to and Back closes it
// (claude-docs/components/group-list.md).

const GroupList = ({ kind, groups, previousHref, nextHref }: GroupListProps): ReactElement => (
  <div className="group-list">
    {groups.length ? (
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
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
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
                <td className="group-list__description">{group.description}</td>
                <td>
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
      <p>No groups yet.</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} soft />
  </div>
);

export default GroupList;
