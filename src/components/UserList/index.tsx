import type { ReactElement } from 'react';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import ImpersonateButton from './impersonate-button';
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
    <search>
      <form
        className="user-list__search"
        method="get"
        action="/admin/users"
        aria-label="Filter users"
      >
        <div className="field">
          <label className="field__label" htmlFor="user-list-query">
            Name or email
          </label>
          <input
            id="user-list-query"
            className="input"
            type="search"
            name="query"
            defaultValue={query}
          />
        </div>
        <label className="checkbox">
          <input type="checkbox" name="awaiting" value="1" defaultChecked={awaitingApproval} />
          Awaiting approval only
        </label>
        <button className="btn btn--solid" type="submit">
          Filter
        </button>
      </form>
    </search>

    {users.length ? (
      <div className="user-list__frame">
        <table className="user-list__table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Can create a coven</th>
              <th scope="col">Signed up</th>
              <th scope="col">Sign-in methods</th>
              <th scope="col">Email verified</th>
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

    {(previousHref || nextHref) && (
      <nav className="user-list__pages" aria-label="Pages">
        <ul>
          {/* Plain anchors, as AdminNav's: a full load re-runs the page's guard. */}
          {previousHref && (
            <li>
              <a href={previousHref}>Previous</a>
            </li>
          )}
          {nextHref && (
            <li>
              <a href={nextHref}>Next</a>
            </li>
          )}
        </ul>
      </nav>
    )}
  </div>
);

export default UserList;
