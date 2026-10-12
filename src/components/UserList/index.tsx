import type { ReactElement } from 'react';
import { isRosterProvider, SOCIAL_PROVIDERS } from '../../lib/social-providers';
import UserListFilter from './filter';
import CreationControl from './creation-control';
import { CheckIcon, CrossIcon } from './icons';
import HistoryLink from './history-link';
import ImpersonateButton from './impersonate-button';
import { changesLocked } from './lock';
import PrimaryAdminMark from './primary-admin-mark';
import RoleControl from './role-control';
import { roleLabel } from './roles';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import ProviderMark from '../ProviderMark';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { noMatchText } from '../../lib/text';
import type { UserListEntry, UserListFilterProps, UserListProps } from './types';
import './index.scss';

// `/admin/users`' filter, table and pager (MB.52). Render-only: the page reads
// the list through the identity service and hands this one page of it. The
// filter is a GET form to the page itself, so a filtered page is an address
// (claude-docs/components/user-list.md).

/**
 * The empty list, naming the filters in use (MB.115, on the owner's call), so
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

/** A provider by its roster label, or by its id when the roster has none. */
function providerLabel(id: string): string {
  return SOCIAL_PROVIDERS.find((provider) => provider.id === id)?.label ?? id;
}

/**
 * A linked provider as its logo on its brand's ground, on the owner's call,
 * named in a tip bubble on hover and in hidden text for a screen reader. A
 * provider with no logo, one since dropped from the roster, keeps its id as
 * text, so the account still says it is linked.
 */
const ProviderLogo = ({ id }: { id: string }): ReactElement => {
  const label = providerLabel(id);
  if (!isRosterProvider(id)) return <span className="user-list__provider-text">{label}</span>;
  return (
    <span className="user-list__hint">
      <ProviderMark id={id} />
      <span className="visually-hidden">{label}</span>
      <span className="user-list__tip" aria-hidden="true">
        {label}
      </span>
    </span>
  );
};

/**
 * A yes-or-no as a mark, on the owner's call: a green check or a red cross,
 * its word in the page for a screen reader since the mark is drawn alone, and
 * where `hint` asks, in a tip bubble on hover too, since the column's heading
 * does not say it. The bubble is the eye's copy, hidden from the reader.
 */
const Mark = ({
  value,
  label,
  hint = false,
}: {
  value: boolean;
  label: string;
  hint?: boolean;
}): ReactElement => (
  <span
    className={[
      'user-list__mark',
      `user-list__mark--${value ? 'yes' : 'no'}`,
      hint && 'user-list__hint',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {value ? <CheckIcon /> : <CrossIcon />}
    <span className="visually-hidden">{label}</span>
    {hint && (
      <span className="user-list__tip" aria-hidden="true">
        {label}
      </span>
    )}
  </span>
);

/**
 * The columns, in the owner's order (MB.59). Impersonate is last, and only
 * where impersonation is registered: an action, its cell unlabelled as a
 * card, at the card's top right beside the name. `changesPaused`: admin
 * changes are paused and the viewer is not the primary admin (MB.63).
 */
const columns = (
  canImpersonate: boolean,
  changesPaused: boolean,
): readonly (StackColumn<UserListEntry> | false)[] => [
  {
    heading: 'Name',
    // The way into their privilege history (MB.200), then the name, on every
    // row: an admin's changes are the ones most worth reading.
    cell: (user) => (
      <span className="user-list__name">
        <HistoryLink email={user.email} name={user.name} />
        {user.name}
      </span>
    ),
  },
  {
    heading: 'Email',
    // Whether the address is verified, then the address, in one cell (the owner's call).
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
    // An admin's role in bold, on the owner's call: the rows to notice. On
    // the right, the control that changes it (MB.59), as Coven Creation holds
    // its own: one column rather than a second saying the same thing. The
    // primary admin is marked by a crown with a tip, and its Revoke's tip
    // says why it cannot be used.
    cell: (user) => (
      <div className="user-list__role">
        <span className="user-list__role-name">
          {user.role === 'admin' ? (
            <strong>{roleLabel(user.role)}</strong>
          ) : (
            <span>{roleLabel(user.role)}</span>
          )}
          {user.primaryAdmin && <PrimaryAdminMark />}
        </span>
        {/* Keyed by the action, so the refresh after a change mounts a fresh
            control for the other one rather than keeping this one's busy state. */}
        <RoleControl
          key={user.role}
          userId={user.id}
          name={user.name}
          emailVerified={user.emailVerified}
          primaryAdmin={user.primaryAdmin}
          paused={changesPaused}
          action={user.role === 'admin' ? 'revoke' : 'grant'}
        />
      </div>
    ),
  },
  {
    heading: 'Coven Creation',
    // Whether they may, and beside it the control that changes it (M5.8);
    // none on an admin's row, whom the users CHECK holds to the flag (MB.177).
    cell: (user) => (
      <div className="user-list__creation">
        <Mark value={user.canCreateWorkspace} label={user.canCreateWorkspace ? 'Yes' : 'No'} />
        {user.role === 'admin' ? null : (
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
    // Logos, empty when none, on the owner's call: a blank reads as none.
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
  // Not on an admin's row: the endpoint refuses one (MB.53). Ruled in red,
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
    <UserListFilter query={query} awaitingApproval={awaitingApproval} role={role} />

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

// The pause switch, which the page puts beside its heading (MB.63): part of
// this list's controls, so it lives here, but drawn outside the list.
export { default as PauseControl } from './pause-control';
