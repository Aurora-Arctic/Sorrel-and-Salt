import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import ImpersonateAction from './impersonate-action';
import { workspaceRoleLabel, workspaceRoleRank } from './roles';
import type { UserCoven, UserDetailProps } from './types';
import './index.scss';

// The body of the modal that opens over `/admin/users` on a user (M9.19):
// the covens they belong to and, where impersonation is registered, the
// action to act as them (claude-docs/components/user-detail.md). Render-only:
// the page reads the memberships through the coven service.

const columns: readonly StackColumn<UserCoven>[] = [
  // Text, never a link: an admin is no member of these covens, so
  // `/coven/[slug]` would answer them 404.
  { heading: 'Coven', cell: (coven) => coven.name },
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
    {/* One level below the modal's own title, an h2. */}
    <section aria-labelledby="user-detail-covens" className="user-detail__section">
      <h3 id="user-detail-covens">Covens</h3>
      <StackTable
        columns={columns}
        rows={ordered(memberships)}
        rowKey={(coven) => coven.workspaceId}
        empty="This user does not belong to any coven yet."
        aria-label="Covens"
      />
    </section>
    {/* Not on an admin's row: the endpoint refuses one (MB.53). */}
    {canImpersonate && user.role !== 'admin' && <ImpersonateAction user={user} />}
  </div>
);

export default UserDetail;
