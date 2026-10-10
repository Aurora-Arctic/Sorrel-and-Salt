import type { ReactElement } from 'react';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import UserListFilter from './filter';
import CreationControl from './creation-control';
import { DiscordIcon, FacebookIcon, GoogleIcon, MicrosoftIcon } from '../SignInPanel/icons';
import { CheckIcon, CrossIcon } from './icons';
import ImpersonateButton from './impersonate-button';
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
  facebook: FacebookIcon,
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
}: {
  user: UserListEntry;
  canImpersonate: boolean;
}): ReactElement => (
  <tr>
    <td>{user.name}</td>
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
    {/* An admin's role in bold, on the owner's call: the rows to notice. */}
    <td>{user.role === 'admin' ? <strong>{ROLE_LABELS.admin}</strong> : ROLE_LABELS[user.role]}</td>
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
            action={user.canCreateWorkspace ? 'revoke' : 'approve'}
          />
        )}
      </div>
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
              <th scope="col">Sign-In Methods</th>
              <th scope="col">Signed Up</th>
              <th scope="col">Coven Creation</th>
              {canImpersonate && (
                <th scope="col" className="user-list__impersonate">
                  Impersonate
                </th>
              )}
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
