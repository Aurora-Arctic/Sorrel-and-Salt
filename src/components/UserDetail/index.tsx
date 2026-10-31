import type { ReactElement, ReactNode } from 'react';
import { CheckIcon, CrossIcon } from '../IconTip/icons';
import CreationControl from '../UserList/creation-control';
import { ProviderLogo } from '../UserList/marks';
import PrimaryAdminMark from '../UserList/primary-admin-mark';
import RoleControl from '../UserList/role-control';
import { roleLabel } from '../UserList/roles';
import TimeoutPanel from '../SupportRequests/timeout-panel';
import ImpersonateAction from './impersonate-action';
import { workspaceRoleLabel, workspaceRoleRank } from './roles';
import type { UserCoven, UserDetailProps } from './types';
import './index.scss';

// The body of the modal over `/admin/users` on a user: the table's facts read-only, their covens
// and the action to act as them (claude-docs/components/user-detail.md). Laid out as the ingredient
// modal is, in hairline-parted sections; render-only.

/**
 * Owners, then members, then viewers, each by coven name. Sorted here because
 * the service's order is unspecified; the list is bounded by the user's own
 * memberships, so sorting it all costs nothing.
 */
const ordered = (memberships: readonly UserCoven[]): UserCoven[] =>
  [...memberships].sort(
    (a, b) => workspaceRoleRank(a.role) - workspaceRoleRank(b.role) || a.name.localeCompare(b.name),
  );

/** A UTC date, as the table's Signed Up column writes one. */
const Day = ({ at }: { at: Date }): ReactElement => (
  <time dateTime={at.toISOString()}>{at.toISOString().slice(0, 10)}</time>
);

/**
 * A yes-or-no as its word, then the table's mark after it, a green check or a red cross: the
 * table's column heading says what the mark means, and here nothing else would.
 */
const Answer = ({ value, children }: { value: boolean; children: ReactNode }): ReactElement => (
  <span className="user-detail__answer">
    {children}
    <span className={`user-list__mark user-list__mark--${value ? 'yes' : 'no'}`}>
      {value ? <CheckIcon /> : <CrossIcon />}
    </span>
  </span>
);

const UserDetail = ({
  user,
  memberships,
  timeouts,
  canImpersonate = false,
  changesPaused = false,
}: UserDetailProps): ReactElement => (
  <div className="user-detail">
    {/* One level below the modal's own title, an h2. */}
    <section aria-labelledby="user-detail-account" className="user-detail__section">
      <h3 id="user-detail-account" className="user-detail__title">
        Account
      </h3>
      {/* The address is the heading's, under the name, so it is not repeated. */}
      <dl className="user-detail__facts">
        <div>
          <dt>Email</dt>
          <dd>
            <Answer value={user.emailVerified}>
              {user.emailVerified ? 'Verified' : 'Unverified'}
            </Answer>
          </dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd className="user-detail__value">
            <span className="user-detail__role">
              {user.role !== 'user' ? (
                <strong>{roleLabel(user.role)}</strong>
              ) : (
                roleLabel(user.role)
              )}
              {user.primaryAdmin && <PrimaryAdminMark />}
            </span>
            {/* Keyed by the role, as on the row: the refresh after a change
                mounts a fresh control offering the others. */}
            <RoleControl
              key={user.role}
              userId={user.id}
              name={user.name}
              emailVerified={user.emailVerified}
              primaryAdmin={user.primaryAdmin}
              paused={changesPaused}
              role={user.role}
              inModal
            />
          </dd>
        </div>
        <div>
          <dt>Coven Creation</dt>
          <dd className="user-detail__value">
            <Answer value={user.canCreateWorkspace}>
              {user.canCreateWorkspace ? 'Yes' : 'No'}
            </Answer>
            {/* None for an admin or a curator, whom the users CHECK holds to the flag. */}
            {user.role === 'user' && (
              <CreationControl
                key={user.canCreateWorkspace ? 'revoke' : 'approve'}
                userId={user.id}
                name={user.name}
                emailVerified={user.emailVerified}
                paused={changesPaused}
                action={user.canCreateWorkspace ? 'revoke' : 'approve'}
                inModal
              />
            )}
          </dd>
        </div>
        <div>
          <dt>Sign-In Methods</dt>
          <dd className="user-list__providers">
            {user.providers.length === 0
              ? 'None'
              : user.providers.map((id) => <ProviderLogo key={id} id={id} />)}
          </dd>
        </div>
        <div>
          <dt>Signed Up</dt>
          <dd>
            <Day at={user.createdAt} />
          </dd>
        </div>
      </dl>
    </section>
    <section aria-labelledby="user-detail-covens" className="user-detail__section">
      <h3 id="user-detail-covens" className="user-detail__title">
        Covens
      </h3>
      {memberships.length === 0 ? (
        <p className="user-detail__none">This user does not belong to any coven yet.</p>
      ) : (
        <ul className="user-detail__covens" aria-labelledby="user-detail-covens">
          {ordered(memberships).map((coven) => (
            <li key={coven.workspaceId}>
              {/* Text, never a link: an admin is no member of these covens,
                  so `/coven/[slug]` would answer them 404. */}
              <span className="user-detail__coven-name">{coven.name}</span>
              <span className="user-detail__coven-meta">
                <span>{workspaceRoleLabel(coven.role)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Joined <Day at={coven.joinedAt} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
    {timeouts && (
      <section aria-label="Support Time-Out" className="user-detail__section">
        <TimeoutPanel userId={user.id} name={user.name} timeouts={timeouts} />
      </section>
    )}
    {/* Not on an admin: the endpoint refuses one. */}
    {canImpersonate && user.role !== 'admin' && <ImpersonateAction user={user} />}
  </div>
);

export default UserDetail;
