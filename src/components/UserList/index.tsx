import type { ReactElement } from 'react';
import UserListFilter from './filter';
import { Mark, ProviderLogo } from './marks';
import HistoryLink from './history-link';
import ImpersonateButton from './impersonate-button';
import PrimaryAdminMark from './primary-admin-mark';
import UserLink from './user-link';
import { roleLabel, SITE_ROLE_ACCESS } from './roles';
import RoleTip from '../RoleTip';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { emptyList, noMatchText } from '../../lib/text';
import { inUtc } from '../../lib/utc';
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
function noMatch({ query, role, awaitingApproval, timedOut, paused }: UserListFilterProps): string {
  const filters = [
    query && `“${query}”`,
    role && `the role ${roleLabel(role)}`,
    awaitingApproval && 'Needs Approval',
    timedOut && 'Support Timed Out',
    paused && 'Access Paused',
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('users', filters, emptyList('users'));
}

/**
 * The columns, in table order. Impersonate is last, and only
 * where impersonation is registered: an action, its cell unlabelled as a
 * card, at the card's top right beside the name.
 */
const columns = (canImpersonate: boolean): readonly (StackColumn<UserListEntry> | false)[] => [
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
    // An admin's or curator's role in bold, each role with the tip saying what it may do. The primary
    // admin carries a crown with a tip. Change Role is the user modal's, so the row is an index into it.
    cell: (user) => (
      <span className="user-list__role-name">
        <RoleTip
          label={roleLabel(user.role)}
          description={SITE_ROLE_ACCESS[user.role]}
          emphasis={user.role !== 'user'}
        />
        {user.primaryAdmin && <PrimaryAdminMark />}
      </span>
    ),
  },
  {
    heading: 'Can Create',
    className: 'user-list__mark-column',
    headingClassName: 'user-list__mark-column',
    // Whether they may create covens. Approve and Revoke are the user modal's.
    cell: (user) => (
      <Mark value={user.canCreateWorkspace} label={user.canCreateWorkspace ? 'Yes' : 'No'} />
    ),
  },
  {
    heading: 'Support',
    className: 'user-list__mark-column',
    headingClassName: 'user-list__mark-column',
    // A green check while they may send support requests; a red cross while a time-out stands, its end or that it has
    // none in the tip.
    cell: ({ supportTimeout }) =>
      supportTimeout ? (
        <Mark
          value={false}
          label={
            supportTimeout.until
              ? `Timed out until ${inUtc(supportTimeout.until)}`
              : 'Timed out with no end date'
          }
          tip={supportTimeout.until ? `Until ${inUtc(supportTimeout.until)}` : 'No end date'}
        />
      ) : (
        <Mark value label="Not timed out" />
      ),
  },
  {
    heading: 'Access',
    className: 'user-list__mark-column',
    headingClassName: 'user-list__mark-column',
    // A green check while their site access is open; a red cross while a pause stands, its end or that it has none in
    // the tip.
    cell: ({ accessPause }) =>
      accessPause ? (
        <Mark
          value={false}
          label={
            accessPause.until
              ? `Paused until ${inUtc(accessPause.until)}`
              : 'Paused with no end date'
          }
          tip={accessPause.until ? `Until ${inUtc(accessPause.until)}` : 'No end date'}
        />
      ) : (
        <Mark value label="Not paused" />
      ),
  },
  {
    heading: 'Logins',
    // Logos, empty when none: a blank reads as none.
    // This and Signed Up are facts no control changes, so muted (index.scss).
    className: 'user-list__fact user-list__mark-column',
    headingClassName: 'user-list__mark-column',
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
  timedOut = false,
  paused = false,
  previousHref,
  nextHref,
  position,
  canImpersonate = false,
}: UserListProps): ReactElement => (
  <ListFrame className="user-list">
    <UserListFilter
      key={`${query}\n${role ?? ''}\n${awaitingApproval}\n${timedOut}\n${paused}`}
      query={query}
      awaitingApproval={awaitingApproval}
      role={role}
      timedOut={timedOut}
      paused={paused}
    />

    <ListBody>
      {/* Roomy, and each cell on one line, the table scrolling in its frame. */}
      <StackTable
        columns={columns(canImpersonate)}
        rows={users}
        rowKey={(user) => user.id}
        empty={noMatch({ query, role, awaitingApproval, timedOut, paused })}
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
