import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { Mark, ProviderLogo } from '../UserList/marks';
import PrimaryAdminMark from '../UserList/primary-admin-mark';
import { roleLabel } from '../UserList/roles';
import ImpersonateAction from './impersonate-action';
import { workspaceRoleLabel, workspaceRoleRank } from './roles';
import type { UserCoven, UserDetailProps } from './types';
import './index.scss';

// The body of the modal that opens over `/admin/users` on a user (M9.19):
// the facts the users table holds about them, read-only, then the covens they
// belong to and, where impersonation is registered, the
// action to act as them (claude-docs/components/user-detail.md). Render-only:
// the page reads the memberships through the coven service.

const columns: readonly StackColumn<UserCoven>[] = [
  // Text, never a link: an admin is no member of these covens, so
  // `/coven/[slug]` would answer them 404.
  { heading: 'Name', cell: (coven) => coven.name },
  { heading: 'Role', cell: (coven) => workspaceRoleLabel(coven.role) },
  {
    heading: 'Joined',
    cell: (coven) => (
      <time dateTime={coven.joinedAt.toISOString()}>
        {coven.joinedAt.toISOString().slice(0, 10)}
      </time>
    ),
  },
];

/**
 * Owners, then members, then viewers, each by coven name. Sorted here because
 * the service's order is unspecified; the list is bounded by the user's own
 * memberships, so sorting it all costs nothing.
 */
const ordered = (memberships: readonly UserCoven[]): UserCoven[] =>
  [...memberships].sort(
    (a, b) => workspaceRoleRank(a.role) - workspaceRoleRank(b.role) || a.name.localeCompare(b.name),
  );

const UserDetail = ({
  user,
  memberships,
  canImpersonate = false,
}: UserDetailProps): ReactElement => (
  <div className="user-detail">
    <dl className="user-detail__facts">
      <div>
        <dt>Email</dt>
        <dd>
          <Mark
            value={user.emailVerified}
            label={user.emailVerified ? 'Verified' : 'Unverified'}
            hint
          />
        </dd>
      </div>
      <div>
        <dt>Role</dt>
        <dd className="user-detail__role">
          {user.role === 'admin' ? <strong>{roleLabel(user.role)}</strong> : roleLabel(user.role)}
          {user.primaryAdmin && <PrimaryAdminMark />}
        </dd>
      </div>
      <div>
        <dt>Coven Creation</dt>
        <dd>
          <Mark value={user.canCreateWorkspace} label={user.canCreateWorkspace ? 'Yes' : 'No'} />
        </dd>
      </div>
      <div>
        <dt>Sign-In Methods</dt>
        <dd className="user-list__providers">
          {user.providers.map((id) => (
            <ProviderLogo key={id} id={id} />
          ))}
        </dd>
      </div>
      <div>
        <dt>Signed Up</dt>
        <dd>
          <time dateTime={user.createdAt.toISOString()}>
            {user.createdAt.toISOString().slice(0, 10)}
          </time>
        </dd>
      </div>
    </dl>
    {/* One level below the modal's own title, an h2. */}
    <section aria-labelledby="user-detail-covens" className="user-detail__section">
      <h3 id="user-detail-covens">Covens</h3>
      <StackTable
        columns={columns}
        rows={ordered(memberships)}
        rowKey={(coven) => coven.workspaceId}
        empty="This user does not belong to any coven yet."
        aria-label="Covens"
        className="user-detail__covens"
      />
    </section>
    {/* Not on an admin's row: the endpoint refuses one (MB.53). */}
    {canImpersonate && user.role !== 'admin' && <ImpersonateAction user={user} />}
  </div>
);

export default UserDetail;
