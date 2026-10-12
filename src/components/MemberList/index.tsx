import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { workspaceRoleLabel } from '../UserDetail/roles';
import type { MemberListEntry, MemberListProps } from './types';
import './index.scss';

// A coven's members, one row each (M6.12), drawn as the admin user list is:
// the stacking `DataTable`, a card per member at phone width. Render-only. The
// page reads the members through `Workspace.members` and decides what
// controls each row gets, passing them in as `actions`, so this component
// holds no permission check (claude-docs/components/member-list.md).

/**
 * The columns: the name, then the role with its change beside it (as the
 * admin list holds Promote and Revoke), then the facts no control changes: when they joined, and who last changed the
 * membership and when, in one Updated column.
 * Remove is last, in a column ruled in red as Impersonate is, since it is the
 * table's one destructive row action, and only when the page passes it.
 */
const columns = (
  currentUserId: string,
  { roleAction, removeAction }: Pick<MemberListProps, 'roleAction' | 'removeAction'>,
): readonly (StackColumn<MemberListEntry> | false)[] => [
  {
    heading: 'Name',
    cell: (member) => (
      <span className="member-list__name">
        {member.name}
        {member.userId === currentUserId && <span className="member-list__you">You</span>}
      </span>
    ),
  },
  {
    heading: 'Role',
    className: 'member-list__role-column',
    headingClassName: 'member-list__role-column',
    // An owner in bold, as the admin list sets an admin: the rows to notice.
    // The word differs for all three roles, so the column never relies on
    // weight alone to tell them apart.
    cell: (member) => (
      <div className="member-list__role">
        {member.role === 'owner' ? (
          <strong>{workspaceRoleLabel(member.role)}</strong>
        ) : (
          <span>{workspaceRoleLabel(member.role)}</span>
        )}
        {roleAction && <span className="member-list__actions">{roleAction(member)}</span>}
      </div>
    ),
  },
  {
    heading: 'Joined',
    className: 'member-list__fact',
    cell: (member) => (
      <time dateTime={member.joinedAt.toISOString()}>
        {member.joinedAt.toISOString().slice(0, 10)}
      </time>
    ),
  },
  {
    heading: 'Updated',
    className: 'member-list__fact',
    // "by Fixture A on 2026-10-12": who last changed the membership, and when.
    // Both are withheld together: a date with no one to ask about it says little.
    cell: (member) =>
      member.updatedBy &&
      member.updatedAt && (
        <span>
          by <strong>{member.updatedBy}</strong> on{' '}
          <time dateTime={member.updatedAt.toISOString()}>
            {member.updatedAt.toISOString().slice(0, 10)}
          </time>
        </span>
      ),
  },
  Boolean(removeAction) && {
    heading: 'Remove',
    action: 'corner',
    headingClassName: 'member-list__remove',
    className: 'member-list__remove',
    cell: (member) => removeAction?.(member),
  },
];

const MemberList = ({
  members,
  currentUserId,
  roleAction,
  removeAction,
}: MemberListProps): ReactElement => (
  <div className="member-list">
    <StackTable
      aria-label="Members"
      columns={columns(currentUserId, { roleAction, removeAction })}
      rows={members}
      rowKey={(member) => member.userId}
      empty="There are no members yet."
      className="data-table--roomy data-table--nowrap"
    />
  </div>
);

export default MemberList;
