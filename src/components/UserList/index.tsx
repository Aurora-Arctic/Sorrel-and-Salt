import type { ReactElement } from 'react';
import UserListFilter from './filter';
import CreationControl from './creation-control';
import { Mark, ProviderLogo } from './marks';
import HistoryLink from './history-link';
import ImpersonateButton from './impersonate-button';
import { changesLocked } from './lock';
import PrimaryAdminMark from './primary-admin-mark';
import RoleControl from './role-control';
import UserLink from './user-link';
import { roleLabel } from './roles';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { noMatchText } from '../../lib/text';
import type { UserListEntry, UserListFilterProps, UserListProps } from './types';
import './index.scss';

// `/admin/users`' filter, table and pager. Render-only: the page reads
// the list through the identity service and hands this one page of it. The
// filter is a GET form to the page itself, so a filtered page is an address
// (claude-docs/components/user-list.md).

/**
 * The empty list, naming the filters in use, so
 * an admin sees what to change: "No users match “ada” and the role Admin.
 * Change or clear the filter to see more."
 */
function noMatch({ query, role, awaitingApproval }: UserListFilterProps): string {
  const filters = [
    query && `“${query}”`,
    role && `the role ${roleLabel(role)}`,
    awaitingApproval && 'Needs Approval',
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('users', filters, 'There are no users yet.');
}

/**
 * The columns, in table order. Impersonate is last, and only
 * where impersonation is registered: an action, its cell unlabelled as a
 * card, at the card's top right beside the name. `changesPaused`: admin
 * changes are paused and the viewer is not the primary admin.
 */
const columns = (
  canImpersonate: boolean,
  changesPaused: boolean,
): readonly (StackColumn<UserListEntry> | false)[] => [
  {
    heading: 'Name',
    // The way into their privilege history, then the name, on every
    // row: an admin's changes are the ones most worth reading. The name opens
    // the user's modal, their covens and Impersonate.
    cell: (user) => (
      <span className="user-list__name">
        <HistoryLink email={user.email} name={user.name} />
        <UserLink href={user.openHref} heading={user.heading} name={user.name} />
      </span>
    ),
  },
  {
    heading: 'Email',
    // Whether the address is verified, then the address, in one cell.
    cell: (user) => (
      <span className="user-list__email">
        <Mark
          value={user.emailVerified}
          label={user.emailVerified ? 'Verified' : 'Unverified'}
          hint
        />
        {user.email}
      </span>
    ),
  },
  {
    heading: 'Role',
    // An admin's or curator's role in bold, with the control that changes it on the right: one
    // column, as Coven Creation holds its own. The primary admin carries a crown with a tip, and
    // its Change Role's tip says why it cannot be used.
    cell: (user) => (
      <div className="user-list__role">
        <span className="user-list__role-name">
          {user.role !== 'user' ? (
            <strong>{roleLabel(user.role)}</strong>
          ) : (
            <span>{roleLabel(user.role)}</span>
          )}
          {user.primaryAdmin && <PrimaryAdminMark />}
        </span>
        {/* Keyed by the role, so the refresh after a change mounts a fresh
            control offering the others rather than keeping this one's busy state. */}
        <RoleControl
          key={user.role}
          userId={user.id}
          name={user.name}
          emailVerified={user.emailVerified}
          primaryAdmin={user.primaryAdmin}
          paused={changesPaused}
          role={user.role}
        />
      </div>
    ),
  },
  {
    heading: 'Coven Creation',
    // Whether they may, and beside it the control that changes it;
    // none on an admin's or a curator's row, whom the users CHECK holds to the
    // flag.
    cell: (user) => (
      <div className="user-list__creation">
        <Mark value={user.canCreateWorkspace} label={user.canCreateWorkspace ? 'Yes' : 'No'} />
        {user.role !== 'user' ? null : (
          // Keyed by the action, so the refresh after a change mounts a fresh
          // control for the other one rather than keeping this one's busy state.
          <CreationControl
            key={user.canCreateWorkspace ? 'revoke' : 'approve'}
            userId={user.id}
            name={user.name}
            emailVerified={user.emailVerified}
            paused={changesPaused}
            action={user.canCreateWorkspace ? 'revoke' : 'approve'}
          />
        )}
      </div>
    ),
  },
  {
    heading: 'Sign-In Methods',
    // Logos, empty when none: a blank reads as none.
    // This and Signed Up are facts no control changes, so muted (index.scss).
    className: 'user-list__fact',
    cell: (user) => (
      <span className="user-list__providers">
        {user.providers.map((id) => (
          <ProviderLogo key={id} id={id} />
        ))}
      </span>
    ),
  },
  {
    heading: 'Signed Up',
    className: 'user-list__fact',
    cell: (user) => (
      <time dateTime={user.createdAt.toISOString()}>
        {user.createdAt.toISOString().slice(0, 10)}
      </time>
    ),
  },
  // Not on an admin's row: the endpoint refuses one. Ruled in red,
  // as acting as someone else is the table's one dangerous control.
  canImpersonate && {
    heading: 'Impersonate',
    action: 'corner',
    headingClassName: 'user-list__impersonate',
    className: 'user-list__impersonate',
    cell: (user) =>
      user.role === 'admin' ? null : <ImpersonateButton userId={user.id} name={user.name} />,
  },
];

const UserList = ({
  users,
  query,
  awaitingApproval,
  role,
  previousHref,
  nextHref,
  position,
  canImpersonate = false,
  adminChanges,
}: UserListProps): ReactElement => (
  <ListFrame className="user-list">
    <UserListFilter
      key={`${query}\n${role ?? ''}\n${awaitingApproval}`}
      query={query}
      awaitingApproval={awaitingApproval}
      role={role}
    />

    <ListBody>
      {/* Roomy, and each cell on one line, the table scrolling in its frame. */}
      <StackTable
        columns={columns(canImpersonate, Boolean(adminChanges && changesLocked(adminChanges)))}
        rows={users}
        rowKey={(user) => user.id}
        empty={noMatch({ query, role, awaitingApproval })}
        className="data-table--roomy data-table--nowrap"
      />

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
    </ListBody>
  </ListFrame>
);

export default UserList;

// The pause switch, which the page puts beside its heading: part of
// this list's controls, so it lives here, but drawn outside the list.
export { default as PauseControl } from './pause-control';
