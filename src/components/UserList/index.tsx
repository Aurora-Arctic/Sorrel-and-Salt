import type { ReactElement } from 'react';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import UserListFilter from './filter';
import CreationControl from './creation-control';
import ImpersonateButton from './impersonate-button';
import Pager from '../Pager';
import type { UserListEntry, UserListProps } from './types';
import './index.scss';

// `/admin/users`' filter, table and pager (MB.52). Render-only: the page reads
// the list through the identity service and hands this one page of it. The
// filter is a GET form to the page itself, so a filtered page is an address
// (claude-docs/components/user-list.md).

const ROLE_LABELS = { admin: 'Admin', user: 'User' } as const;

/** A provider by its roster label, or by its id when the roster has none. */
function providerLabel(id: string): string {
  return SOCIAL_PROVIDERS.find((provider) => provider.id === id)?.label ?? id;
}

const yesNo = (value: boolean): string => (value ? 'Yes' : 'No');

const UserRow = ({
  user,
  canImpersonate,
}: {
  user: UserListEntry;
  canImpersonate: boolean;
}): ReactElement => (
  <tr>
    <td>{user.name}</td>
    <td>{user.email}</td>
    <td>{ROLE_LABELS[user.role]}</td>
    <td>{yesNo(user.canCreateWorkspace)}</td>
    <td>
      <time dateTime={user.createdAt.toISOString()}>
        {user.createdAt.toISOString().slice(0, 10)}
      </time>
    </td>
    <td>{user.providers.length ? user.providers.map(providerLabel).join(', ') : 'None'}</td>
    <td>{yesNo(user.emailVerified)}</td>
    {/* Approve or revoke (M5.8); nothing on an admin's row, whom the users
        CHECK holds to the flag (MB.177). */}
    <td>
      {user.role === 'admin' ? null : (
        // Keyed by the action, so the refresh after a change mounts a fresh
        // control for the other one rather than keeping this one's busy state.
        <CreationControl
          key={user.canCreateWorkspace ? 'revoke' : 'approve'}
          userId={user.id}
          name={user.name}
          action={user.canCreateWorkspace ? 'revoke' : 'approve'}
        />
      )}
    </td>
    {/* Not on an admin's row: the endpoint refuses one (MB.53). */}
    {canImpersonate && (
      <td>
        {user.role === 'admin' ? null : <ImpersonateButton userId={user.id} name={user.name} />}
      </td>
    )}
  </tr>
);

const UserList = ({
  users,
  query,
  awaitingApproval,
  previousHref,
  nextHref,
  canImpersonate = false,
}: UserListProps): ReactElement => (
  <div className="user-list">
    <UserListFilter query={query} awaitingApproval={awaitingApproval} />

    {users.length ? (
      <div className="data-table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Can create a coven</th>
              <th scope="col">Signed up</th>
              <th scope="col">Sign-in methods</th>
              <th scope="col">Email verified</th>
              <th scope="col">Approval</th>
              {canImpersonate && <th scope="col">Impersonate</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} canImpersonate={canImpersonate} />
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p>No users match.</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} />
  </div>
);

export default UserList;
