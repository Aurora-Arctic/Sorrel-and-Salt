import type { ReactElement } from 'react';
import StackTable, { updatedColumn } from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { workspaceRoleLabel } from '../UserDetail/roles';
import type { MemberListEntry, MemberListProps } from './types';
import './index.scss';

// A coven's members, one row each, drawn as the admin user list is: the stacking
// `DataTable`, a card per member at phone width. Render-only. The page reads the members
// through `Workspace.members` and passes each row's controls in as `actions`, so this holds
// no permission check (claude-docs/components/member-list.md).

/**
 * The columns: name, address where asked, role with its change, then joined, invited by and Updated; Remove is last, ruled in red, and only when the page passes it.
 * (claude-docs/components/member-list.md, "Columns").
 */
const columns = (
  currentUserId: string,
  {
    showEmail,
    roleAction,
    removeAction,
  }: Pick<MemberListProps, 'showEmail' | 'roleAction' | 'removeAction'>,
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
  // The address alone, with no verified mark: a seat is only ever taken by a verified
  // address, and an address changes only at verification, so a member's always is.
  Boolean(showEmail) && {
    heading: 'Email',
    cell: (member) => member.email,
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
    heading: 'Invited By',
    className: 'member-list__fact',
    cell: (member) => member.invitedBy && <span>{member.invitedBy}</span>,
  },
  updatedColumn('member-list__fact'),
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
  showEmail,
  roleAction,
  removeAction,
}: MemberListProps): ReactElement => (
  <div className="member-list">
    <StackTable
      aria-label="Members"
      columns={columns(currentUserId, { showEmail, roleAction, removeAction })}
      rows={members}
      rowKey={(member) => member.userId}
      empty="There are no members yet."
      className="data-table--roomy data-table--nowrap"
    />
  </div>
);

export default MemberList;
