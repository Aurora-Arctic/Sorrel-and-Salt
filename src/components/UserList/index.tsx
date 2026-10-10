import type { ReactElement } from 'react';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import UserListFilter from './filter';
import CreationControl from './creation-control';
import { DiscordIcon, FacebookMark, GoogleIcon, MicrosoftIcon } from '../SignInPanel/icons';
import { CheckIcon, CrossIcon } from './icons';
import HistoryLink from './history-link';
import ImpersonateButton from './impersonate-button';
import PrimaryAdminMark from './primary-admin-mark';
import RoleControl from './role-control';
import Pager from '../Pager';
import type { UserListEntry, UserListProps } from './types';
import './index.scss';

// `/admin/users`' filter, table and pager (MB.52). Render-only: the page reads
// the list through the identity service and hands this one page of it. The
// filter is a GET form to the page itself, so a filtered page is an address
// (claude-docs/components/user-list.md).

const ROLE_LABELS = { admin: 'Admin', user: 'User' } as const;

/** Each roster provider's own mark, as the sign-in page draws it. */
const PROVIDER_LOGOS: Record<string, () => ReactElement> = {
  discord: DiscordIcon,
  facebook: FacebookMark,
  google: GoogleIcon,
  microsoft: MicrosoftIcon,
};

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
  const Logo = PROVIDER_LOGOS[id];
  const label = providerLabel(id);
  if (!Logo) return <span className="user-list__provider-text">{label}</span>;
  return (
    <span className={`user-list__hint user-list__provider user-list__provider--${id}`}>
      <Logo />
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

const UserRow = ({
  user,
  canImpersonate,
  changesPaused,
}: {
  user: UserListEntry;
  canImpersonate: boolean;
  /** Admin changes are paused and the viewer is not the primary admin (MB.63). */
  changesPaused: boolean;
}): ReactElement => (
  <tr>
    {/* The way into their privilege history (MB.200), then the name, on
        every row: an admin's changes are the ones most worth reading. */}
    <td>
      <span className="user-list__name">
        <HistoryLink email={user.email} name={user.name} />
        {user.name}
      </span>
    </td>
    {/* Whether the address is verified, then the address, in one cell (the owner's call). */}
    <td>
      <span className="user-list__email">
        <Mark
          value={user.emailVerified}
          label={user.emailVerified ? 'Verified' : 'Unverified'}
          hint
        />
        {user.email}
      </span>
    </td>
    {/* An admin's role in bold, on the owner's call: the rows to notice. On
        the right, the control that changes it (MB.59), as Coven Creation holds
        its own: one column rather than a second saying the same thing. The
        primary admin is marked by a crown with a tip, and its Revoke's tip
        says why it cannot be used. */}
    <td>
      <div className="user-list__role">
        <span className="user-list__role-name">
          {user.role === 'admin' ? (
            <strong>{ROLE_LABELS.admin}</strong>
          ) : (
            <span>{ROLE_LABELS[user.role]}</span>
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
    </td>
    {/* Whether they may, and beside it the control that changes it (M5.8);
        none on an admin's row, whom the users CHECK holds to the flag (MB.177). */}
    <td>
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
            action={user.canCreateWorkspace ? 'revoke' : 'approve'}
          />
        )}
      </div>
    </td>
    {/* Logos, empty when none, on the owner's call: a blank reads as none. */}
    <td>
      <span className="user-list__providers">
        {user.providers.map((id) => (
          <ProviderLogo key={id} id={id} />
        ))}
      </span>
    </td>
    <td>
      <time dateTime={user.createdAt.toISOString()}>
        {user.createdAt.toISOString().slice(0, 10)}
      </time>
    </td>
    {/* Not on an admin's row: the endpoint refuses one (MB.53). Tinted red,
        as acting as someone else is the table's one dangerous control. */}
    {canImpersonate && (
      <td className="user-list__impersonate">
        {user.role === 'admin' ? null : <ImpersonateButton userId={user.id} name={user.name} />}
      </td>
    )}
  </tr>
);

const UserList = ({
  users,
  query,
  awaitingApproval,
  role,
  previousHref,
  nextHref,
  canImpersonate = false,
  adminChanges,
}: UserListProps): ReactElement => (
  <div className="user-list">
    <UserListFilter query={query} awaitingApproval={awaitingApproval} role={role} />

    {users.length ? (
      <div className="data-table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Coven Creation</th>
              <th scope="col">Sign-In Methods</th>
              <th scope="col">Signed Up</th>
              {canImpersonate && (
                <th scope="col" className="user-list__impersonate">
                  Impersonate
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                canImpersonate={canImpersonate}
                // The page's own read of the pause, not a second query: the
                // primary admin (`canToggle`) is exempt. The service still refuses.
                changesPaused={Boolean(adminChanges?.paused && !adminChanges.canToggle)}
              />
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

// The pause switch, which the page puts beside its heading (MB.63): part of
// this list's controls, so it lives here, but drawn outside the list.
export { default as PauseControl } from './pause-control';
