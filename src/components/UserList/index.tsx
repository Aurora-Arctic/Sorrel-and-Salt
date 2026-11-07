import type { ReactElement } from 'react';
import UserListFilter from './filter';
import { Mark, ProviderLogo } from './marks';
import UntilMark from './until-mark';
import HistoryLink from './history-link';
import ImpersonateButton from './impersonate-button';
import PrimaryAdminMark from './primary-admin-mark';
import UserLink from './user-link';
import { roleLabel, SITE_ROLE_ACCESS } from './roles';
import RoleTip from '../RoleTip';
import ListFrame, { ListBody } from '../ListFrame';
import { UserListBodySkeleton } from './skeleton';
import Pager from '../Pager';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { agreedVersionOfColumns, formatAgreementVersion } from '../../lib/agreement-version';
import { PendingLink } from '../../lib/navigation';
import { USERS_PATH } from './href';
import { emptyList, noMatchText } from '../../lib/text';
import type { UserListEntry, UserListFilterProps, UserListProps } from './types';
import './index.scss';

// `/keepers/users`' filter, table and pager. Render-only: the filter is a GET form to the page itself, so a filtered page is
// an address (claude-docs/components/user-list.md).

/** The empty list, naming the filters in use so a keeper sees what to change. */
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

function isFiltered({
  query,
  role,
  awaitingApproval,
  timedOut,
  paused,
}: UserListFilterProps): boolean {
  return Boolean(query || role || awaitingApproval || timedOut || paused);
}

const columns = (canImpersonate: boolean): readonly (StackColumn<UserListEntry> | false)[] => [
  {
    heading: 'Name',
    cell: (user) => (
      <span className="user-list__name">
        <HistoryLink email={user.email} name={user.name} />
        <UserLink href={user.openHref} heading={user.heading} name={user.name} />
      </span>
    ),
  },
  {
    heading: 'Email',
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
    // A keeper's or curator's role in bold, each role with the tip saying what it may do. The primary
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
    cell: (user) => (
      <Mark value={user.canCreateWorkspace} label={user.canCreateWorkspace ? 'Yes' : 'No'} />
    ),
  },
  {
    heading: 'Support',
    className: 'user-list__mark-column',
    headingClassName: 'user-list__mark-column',
    cell: ({ supportTimeout }) =>
      supportTimeout ? (
        <UntilMark standing="Timed out" until={supportTimeout.until} />
      ) : (
        <Mark value label="Not timed out" />
      ),
  },
  {
    heading: 'Access',
    className: 'user-list__mark-column',
    headingClassName: 'user-list__mark-column',
    cell: ({ accessPause }) =>
      accessPause ? (
        <UntilMark standing="Paused" until={accessPause.until} />
      ) : (
        <Mark value label="Not paused" />
      ),
  },
  {
    heading: 'Logins',
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
    heading: 'Terms',
    className: 'user-list__fact',
    cell: (user) =>
      user.agreedTermsVersion === null ? (
        <Mark value={false} label="Not agreed" />
      ) : (
        `Version ${formatAgreementVersion(agreedVersionOfColumns(user))}`
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

    <ListBody skeleton={<UserListBodySkeleton canImpersonate={canImpersonate} />}>
      {/* Roomy, and each cell on one line, the table scrolling in its frame. */}
      <StackTable
        columns={columns(canImpersonate)}
        rows={users}
        rowKey={(user) => user.id}
        empty={noMatch({ query, role, awaitingApproval, timedOut, paused })}
        emptyLabel={
          isFiltered({ query, role, awaitingApproval, timedOut, paused }) ? 'No Matches' : undefined
        }
        emptyAction={
          isFiltered({ query, role, awaitingApproval, timedOut, paused }) ? (
            <PendingLink href={USERS_PATH} className="btn btn--quiet">
              Clear Filters
            </PendingLink>
          ) : undefined
        }
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
