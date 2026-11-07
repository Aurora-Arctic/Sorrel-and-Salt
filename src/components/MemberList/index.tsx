import type { ReactElement } from 'react';
import StackTable, { updatedColumn } from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { emptyList } from '../../lib/text';
import { workspaceRoleLabel } from '../UserDetail/roles';
import RoleTip from '../RoleTip';
import { Mark } from '../UserList/marks';
import UntilMark from '../UserList/until-mark';
import MemberLink from './member-link';
import { WORKSPACE_ROLE_ACCESS } from './role-access';
import type { MemberListEntry, MemberListProps } from './types';
import './index.scss';

// A coven's members, one row each, drawn as the admin user list is. Render-only, with no row actions: a name opens the
// member's modal (claude-docs/components/member-list.md).

/**
 * The columns: name, address where asked, role, then joined, invited by, Updated and, where asked, a standing pause.
 * (claude-docs/components/member-list.md, "Contracts").
 */
const columns = (
  currentUserId: string,
  { showEmail, showAccess }: Pick<MemberListProps, 'showEmail' | 'showAccess'>,
): readonly (StackColumn<MemberListEntry> | false)[] => [
  {
    heading: 'Name',
    cell: (member) => (
      <span className="member-list__name">
        {member.openHref && member.heading ? (
          <MemberLink href={member.openHref} heading={member.heading} name={member.name} />
        ) : (
          member.name
        )}
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
    // A steward in bold, as the admin list sets an admin: the rows to notice.
    // The word differs for all three roles, so the column never relies on
    // weight alone to tell them apart. Each carries the tip saying what it may do.
    cell: (member) => (
      <div className="member-list__role">
        <RoleTip
          label={workspaceRoleLabel(member.role)}
          description={WORKSPACE_ROLE_ACCESS[member.role]}
          emphasis={member.role === 'owner'}
        />
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
  // A green check while the member's access is open, a red cross while a pause stands, its end or that it has none
  // in the tip and in hidden text, as the admin user list marks a site pause.
  Boolean(showAccess) && {
    heading: 'Access',
    className: 'member-list__mark-column',
    headingClassName: 'member-list__mark-column',
    cell: ({ paused }) => {
      if (!paused) return <Mark value label="Not paused" hint />;
      return <UntilMark standing="Paused" until={paused.until} />;
    },
  },
];

const MemberList = ({
  members,
  currentUserId,
  showEmail,
  showAccess,
}: MemberListProps): ReactElement => (
  <div className="member-list">
    <StackTable
      aria-label="Members"
      columns={columns(currentUserId, { showEmail, showAccess })}
      rows={members}
      rowKey={(member) => member.userId}
      empty={emptyList('members')}
      className="data-table--roomy data-table--nowrap"
    />
  </div>
);

export default MemberList;
