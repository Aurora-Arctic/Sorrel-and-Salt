import type { Story } from '@ladle/react';
import type { PropsWithChildren } from 'react';
import { isRosterProvider } from '../../lib/social-providers';
import { stackCell, tableRole } from '../../lib/table-roles';
import { FieldShell, fieldDescription } from '../Field';
import Modal from '../Modal';
import PageHeader from '../PageHeader';
import ProviderMark from '../ProviderMark';
import UserList, { PauseControl } from '.';
import CreationControl from './creation-control';
import HistoryLink from './history-link';
import { CheckIcon, CrossIcon } from './icons';
import ImpersonateButton from './impersonate-button';
import RoleControl from './role-control';
import './controls.scss';
import type { UserListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/UserList. The filter
// and the pager reach `/admin/users`, and each name's permissions history icon
// `/admin/privilege-changes` (MB.200), neither of which the workshop serves;
// hover or focus an icon to see its tip.
export default {
  title: 'Admin / Users',
};

const USERS: readonly UserListEntry[] = [
  {
    id: 'u-ada',
    name: 'Ada Fixturewort',
    email: 'ada@users.test',
    role: 'admin',
    canCreateWorkspace: true,
    createdAt: new Date('2026-03-04T05:06:07Z'),
    providers: ['discord', 'google'],
    emailVerified: true,
    primaryAdmin: false,
  },
  {
    id: 'u-bo',
    name: 'Bo Fixturewort',
    email: 'bo@users.test',
    role: 'user',
    canCreateWorkspace: false,
    createdAt: new Date('2026-05-06T07:08:09Z'),
    providers: ['microsoft'],
    emailVerified: false,
    primaryAdmin: false,
  },
  // Approved, so the row offers Revoke rather than Approve (M5.8).
  {
    id: 'u-cy',
    name: 'Cy Fixturewort',
    email: 'cy@users.test',
    role: 'user',
    canCreateWorkspace: true,
    createdAt: new Date('2026-06-07T08:09:10Z'),
    // Facebook among them, so its mark shows (MB.63).
    providers: ['facebook', 'google'],
    emailVerified: true,
    primaryAdmin: false,
  },
];

// Inside the admin layout's frame, so the workshop shows what the page shows.
const Frame = ({ children }: PropsWithChildren) => (
  <div className="admin-layout">
    <main>{children}</main>
  </div>
);

export const Default: Story = () => (
  <Frame>
    <UserList users={USERS} query="" awaitingApproval={false} nextHref="#next" />
  </Frame>
);

export const Filtered: Story = () => (
  <Frame>
    <UserList
      users={USERS.filter((user) => !user.canCreateWorkspace)}
      query="fixturewort"
      awaitingApproval
      previousHref="#previous"
    />
  </Frame>
);

export const NoMatch: Story = () => (
  <Frame>
    <UserList users={[]} query="nobody" awaitingApproval={false} />
  </Frame>
);

// Where impersonation is registered (MB.53): an Impersonate on each non-admin
// row. In the workshop the call reaches no server, so a click shows the refusal.
export const WithImpersonation: Story = () => (
  <Frame>
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate />
  </Frame>
);

// MB.205: two users awaiting approval, one unverified and one verified. Approve
// on the first opens a confirmation warning that nobody has proved who holds
// the address; on the second, none.
export const UnverifiedApproval: Story = () => (
  <Frame>
    <UserList
      users={[
        USERS[1] as UserListEntry,
        {
          id: 'u-di',
          name: 'Di Fixturewort',
          email: 'di@users.test',
          role: 'user',
          canCreateWorkspace: false,
          createdAt: new Date('2026-07-08T09:10:11Z'),
          providers: ['discord'],
          emailVerified: true,
          primaryAdmin: false,
        },
      ]}
      query=""
      awaitingApproval
    />
  </Frame>
);

// MB.59: the primary admin, labelled, its Revoke in view but unusable with the
// reason beside it; a second admin's Revoke and each user's Grant open their
// confirmations, Grant warning on Bo's unverified address.
export const AdminRoles: Story = () => (
  <Frame>
    <UserList
      users={[
        { ...(USERS[0] as UserListEntry), primaryAdmin: true },
        {
          id: 'u-eve',
          name: 'Eve Fixturewort',
          email: 'eve@users.test',
          role: 'admin',
          canCreateWorkspace: true,
          createdAt: new Date('2026-08-09T10:11:12Z'),
          providers: ['google'],
          emailVerified: true,
          primaryAdmin: false,
        },
        ...USERS.slice(1),
      ]}
      query=""
      awaitingApproval={false}
    />
  </Frame>
);

// MB.63: the page's header with the switch beside the heading, as
// /admin/users draws it. Paused, to the primary admin: the warning and a
// usable Resume, and every row's control usable, since the pause exempts it.
export const AdminChangesPaused: Story = () => (
  <Frame>
    <PageHeader title="Users" action={<PauseControl paused canToggle />} />
    <UserList
      users={USERS}
      query=""
      awaitingApproval={false}
      adminChanges={{ paused: true, canToggle: true }}
    />
  </Frame>
);

// Paused, to another admin: the warning, Resume locked with its reason in a
// tip, and every Grant, Revoke, Approve and coven-creation Revoke locked with
// the pause's reason.
export const AdminChangesNotPrimary: Story = () => (
  <Frame>
    <PageHeader title="Users" action={<PauseControl paused canToggle={false} />} />
    <UserList
      users={USERS}
      query=""
      awaitingApproval={false}
      adminChanges={{ paused: true, canToggle: false }}
    />
  </Frame>
);

// At phone width, the list as it ships: every row a card (`.data-table--stack`),
// each fact led by its column's name, Impersonate across the card's foot.
export const PhoneDark: Story = () => (
  <Frame>
    <PageHeader title="Users" action={<PauseControl paused={false} canToggle />} />
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
  </Frame>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <Frame>
    <PageHeader title="Users" action={<PauseControl paused={false} canToggle />} />
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
  </Frame>
);
PhoneLight.meta = { theme: 'light', width: 375 };

// ---------------------------------------------------------------------------
// Proposals for the section's sign-off (MB.115, 1d). Story-only markup, never a
// prop of the component, so the losing ones are deleted with no dead path left
// in it. The `Proposal…` names are the ones the sign-off comment cites.
// ---------------------------------------------------------------------------

/** A yes-or-no as the list draws it, for the static proposals. */
const StoryMark = ({ value, label }: { value: boolean; label: string }) => (
  <span className={`user-list__mark user-list__mark--${value ? 'yes' : 'no'}`}>
    {value ? <CheckIcon /> : <CrossIcon />}
    <span className="visually-hidden">{label}</span>
  </span>
);

const StoryRole = ({ user }: { user: UserListEntry }) => (
  <div className="user-list__role">
    <span className="user-list__role-name">
      {user.role === 'admin' ? <strong>Admin</strong> : <span>User</span>}
    </span>
    <RoleControl
      userId={user.id}
      name={user.name}
      emailVerified={user.emailVerified}
      primaryAdmin={user.primaryAdmin}
      action={user.role === 'admin' ? 'revoke' : 'grant'}
    />
  </div>
);

const StoryCreation = ({ user }: { user: UserListEntry }) => (
  <div className="user-list__creation">
    <StoryMark value={user.canCreateWorkspace} label={user.canCreateWorkspace ? 'Yes' : 'No'} />
    {user.role === 'admin' ? null : (
      <CreationControl
        userId={user.id}
        name={user.name}
        emailVerified={user.emailVerified}
        action={user.canCreateWorkspace ? 'revoke' : 'approve'}
      />
    )}
  </div>
);

const StoryMethods = ({ user }: { user: UserListEntry }) => (
  <span className="user-list__providers">
    {user.providers.map((id) =>
      isRosterProvider(id) ? <ProviderMark key={id} id={id} /> : <span key={id}>{id}</span>,
    )}
  </span>
);

const signedUp = (user: UserListEntry) => (
  <time dateTime={user.createdAt.toISOString()}>{user.createdAt.toISOString().slice(0, 10)}</time>
);

// Story-only styling for the proposals, in raw values since a story has no
// Sass: 0.75rem is `space(3)`, 0.8125rem the `caption` size, 0.5rem
// `radius('surface')`.
const PROPOSAL_STYLES = `
  .proposal-desktop-a .data-table td { padding-block: 0.75rem; }
  .proposal-desktop-a .data-table td:is([data-label='Sign-In Methods'], [data-label='Signed Up']) {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }
  /* The tint gone but the ground still opaque, the page or the band's card,
     since the column stays sticky while a narrow frame scrolls beneath it;
     above the stacking width only, where the cards take over (40rem is
     the table-stack-width token). */
  @container data-table (width > 40rem) {
    .proposal-desktop-a .user-list .data-table :is(thead, tbody) tr:nth-child(n) .user-list__impersonate {
      background-color: var(--surface-page);
      color: inherit;
    }
    .proposal-desktop-a .user-list .data-table tbody tr:nth-child(even) .user-list__impersonate {
      background-color: var(--surface-card);
    }
  }
  .proposal-user-cell { display: flex; flex-direction: column; gap: 0.25rem; }
  .proposal-user-cell__email { color: var(--text-muted); font-size: 0.8125rem; }
  .proposal-disclosure { padding: 0.75rem; border-radius: 0.5rem; background-color: var(--surface-card); }
  .proposal-disclosure summary { cursor: pointer; font-weight: 500; }
  .proposal-disclosure dl { display: grid; gap: 0.5rem; margin: 0.75rem 0 0; }
  .proposal-disclosure dt { color: var(--text-muted); font-size: 0.8125rem; }
  .proposal-disclosure dd { margin: 0; }
  /* A user's two rows banded together: the primitive's even-row band off,
     then every other pair on the card. */
  .proposal-two-tier .data-table tbody tr:nth-child(even) { background-color: transparent; }
  .proposal-two-tier .data-table tbody tr:nth-child(4n + 3),
  .proposal-two-tier .data-table tbody tr:nth-child(4n + 4) { background-color: var(--surface-card); }
  .proposal-two-tier__controls { display: flex; flex-wrap: wrap; gap: 0.5rem; }
`;

const ProposalStyles = () => <style>{PROPOSAL_STYLES}</style>;

// 1d.1 A (recommended): CSS-only cards, the table's DOM and roles kept. This
// is what the component now ships; the pair is here so the comment can cite
// it beside B and C.
const PhoneCardsA = () => (
  <Frame>
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate />
  </Frame>
);

export const ProposalPhoneCardsADark: Story = () => <PhoneCardsA />;
ProposalPhoneCardsADark.meta = { theme: 'dark', width: 375 };

export const ProposalPhoneCardsALight: Story = () => <PhoneCardsA />;
ProposalPhoneCardsALight.meta = { theme: 'light', width: 375 };

// 1d.1 B: each user a `<details>` disclosure, its name and role in the summary
// and every other fact and control behind a tap. Changes the DOM, so the
// row-and-cell tests would be rewritten.
const PhoneDisclosureB = () => (
  <Frame>
    <ProposalStyles />
    <div className="user-list list-frame">
      {USERS.map((user) => (
        <details key={user.id} className="proposal-disclosure">
          <summary>
            {user.name} · {user.role === 'admin' ? 'Admin' : 'User'}
          </summary>
          <dl>
            <dt>Email</dt>
            <dd>
              <span className="user-list__email">
                <StoryMark
                  value={user.emailVerified}
                  label={user.emailVerified ? 'Verified' : 'Unverified'}
                />
                {user.email}
              </span>
            </dd>
            <dt>Role</dt>
            <dd>
              <StoryRole user={user} />
            </dd>
            <dt>Coven Creation</dt>
            <dd>
              <StoryCreation user={user} />
            </dd>
            <dt>Sign-In Methods</dt>
            <dd>
              <StoryMethods user={user} />
            </dd>
            <dt>Signed Up</dt>
            <dd>{signedUp(user)}</dd>
          </dl>
          {user.role === 'admin' ? null : <ImpersonateButton userId={user.id} name={user.name} />}
        </details>
      ))}
    </div>
  </Frame>
);

export const ProposalPhoneDisclosureBDark: Story = () => <PhoneDisclosureB />;
ProposalPhoneDisclosureBDark.meta = { theme: 'dark', width: 375 };

export const ProposalPhoneDisclosureBLight: Story = () => <PhoneDisclosureB />;
ProposalPhoneDisclosureBLight.meta = { theme: 'light', width: 375 };

// 1d.1 C: two rows per user, the facts above and a full-width row of its
// controls beneath (`colSpan`). Doubles the rows and breaks the banding and
// the row-and-cell tests; the facts row still has to drop columns to fit.
const PhoneTwoTierC = () => (
  <Frame>
    <ProposalStyles />
    <div className="user-list list-frame proposal-two-tier">
      <div className="data-table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Coven Creation</th>
            </tr>
          </thead>
          <tbody>
            {USERS.flatMap((user) => [
              <tr key={`${user.id}-facts`}>
                <td>{user.name}</td>
                <td>{user.role === 'admin' ? <strong>Admin</strong> : 'User'}</td>
                <td>
                  <StoryMark
                    value={user.canCreateWorkspace}
                    label={user.canCreateWorkspace ? 'Yes' : 'No'}
                  />
                </td>
              </tr>,
              <tr key={`${user.id}-controls`}>
                <td colSpan={3}>
                  <div className="proposal-two-tier__controls">
                    <RoleControl
                      userId={user.id}
                      name={user.name}
                      emailVerified={user.emailVerified}
                      primaryAdmin={user.primaryAdmin}
                      action={user.role === 'admin' ? 'revoke' : 'grant'}
                    />
                    {user.role === 'admin' ? null : (
                      <>
                        <CreationControl
                          userId={user.id}
                          name={user.name}
                          emailVerified={user.emailVerified}
                          action={user.canCreateWorkspace ? 'revoke' : 'approve'}
                        />
                        <ImpersonateButton userId={user.id} name={user.name} />
                      </>
                    )}
                  </div>
                </td>
              </tr>,
            ])}
          </tbody>
        </table>
      </div>
    </div>
  </Frame>
);

export const ProposalPhoneTwoTierCDark: Story = () => <PhoneTwoTierC />;
ProposalPhoneTwoTierCDark.meta = { theme: 'dark', width: 375 };

export const ProposalPhoneTwoTierCLight: Story = () => <PhoneTwoTierC />;
ProposalPhoneTwoTierCLight.meta = { theme: 'light', width: 375 };

// 1d.2 A (recommended): the seven columns in today's order, restyled. Read-only
// facts (Sign-In Methods, Signed Up) muted at the caption size; rows at
// `space(3)`; the Impersonate column without its tint or red text, keeping its
// red rule and the wax button, so it reads as danger by shape and words.
const DesktopColumnsA = () => (
  <Frame>
    <ProposalStyles />
    <div className="proposal-desktop-a">
      <UserList users={USERS} query="" awaitingApproval={false} canImpersonate />
    </div>
  </Frame>
);

export const ProposalDesktopColumnsA: Story = () => <DesktopColumnsA />;

export const ProposalDesktopColumnsAPhoneDark: Story = () => <DesktopColumnsA />;
ProposalDesktopColumnsAPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalDesktopColumnsAPhoneLight: Story = () => <DesktopColumnsA />;
ProposalDesktopColumnsAPhoneLight.meta = { theme: 'light', width: 375 };

// 1d.2 B: Name and Email merged into one User column, the address muted
// beneath the name. Frees a column's width; changes the column count, so the
// cell-index tests and the e2e row text would be rewritten.
const DesktopUserColumnB = () => (
  <Frame>
    <ProposalStyles />
    <div className="user-list list-frame">
      <div className="data-table-frame">
        <table className="data-table data-table--stack" {...tableRole('table')}>
          <thead {...tableRole('rowgroup')}>
            <tr {...tableRole('row')}>
              {[
                'User',
                'Role',
                'Coven Creation',
                'Sign-In Methods',
                'Signed Up',
                'Impersonate',
              ].map((heading) => (
                <th key={heading} scope="col" {...tableRole('columnheader')}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody {...tableRole('rowgroup')}>
            {USERS.map((user) => (
              <tr key={user.id} {...tableRole('row')}>
                <td {...stackCell('User')}>
                  <span className="proposal-user-cell">
                    <span className="user-list__name">
                      <HistoryLink email={user.email} name={user.name} />
                      {user.name}
                    </span>
                    <span className="user-list__email proposal-user-cell__email">
                      <StoryMark
                        value={user.emailVerified}
                        label={user.emailVerified ? 'Verified' : 'Unverified'}
                      />
                      {user.email}
                    </span>
                  </span>
                </td>
                <td {...stackCell('Role')}>
                  <StoryRole user={user} />
                </td>
                <td {...stackCell('Coven Creation')}>
                  <StoryCreation user={user} />
                </td>
                <td {...stackCell('Sign-In Methods')}>
                  <StoryMethods user={user} />
                </td>
                <td {...stackCell('Signed Up')}>{signedUp(user)}</td>
                <td className="user-list__impersonate" {...stackCell('')}>
                  {user.role === 'admin' ? null : (
                    <ImpersonateButton userId={user.id} name={user.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Frame>
);

export const ProposalDesktopUserColumnB: Story = () => <DesktopUserColumnB />;

export const ProposalDesktopUserColumnBPhoneDark: Story = () => <DesktopUserColumnB />;
ProposalDesktopUserColumnBPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalDesktopUserColumnBPhoneLight: Story = () => <DesktopUserColumnB />;
ProposalDesktopUserColumnBPhoneLight.meta = { theme: 'light', width: 375 };

// 1d.5, Impersonate. A: today, no confirmation: the row's button acts at once,
// busy until the site opens as the user (the `WithImpersonation` list).
const ImpersonateConfirmA = () => (
  <Frame>
    <UserList users={USERS.slice(1, 2)} query="" awaitingApproval={false} canImpersonate />
  </Frame>
);

export const ProposalImpersonateConfirmA: Story = () => <ImpersonateConfirmA />;

export const ProposalImpersonateConfirmAPhoneDark: Story = () => <ImpersonateConfirmA />;
ProposalImpersonateConfirmAPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalImpersonateConfirmAPhoneLight: Story = () => <ImpersonateConfirmA />;
ProposalImpersonateConfirmAPhoneLight.meta = { theme: 'light', width: 375 };

// 1d.5, Impersonate. B (recommended): the row's button asks first, as every
// other row action does, saying what impersonating means and how it ends. The
// action stays the wax.
const ImpersonateConfirmB = () => (
  <Modal title="Impersonate User" onClose={() => {}}>
    {(close) => (
      <>
        <p>
          Impersonate <strong>Bo Fixturewort</strong>? You will see the site as they do and act as
          them until you press Stop Impersonating at the top of the page.
        </p>
        <div className="modal__actions">
          <button className="btn btn--destructive" type="button">
            Impersonate
          </button>
          <button className="btn btn--quiet" type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </>
    )}
  </Modal>
);

export const ProposalImpersonateConfirmB: Story = () => <ImpersonateConfirmB />;
ProposalImpersonateConfirmB.meta = { iframed: true };

export const ProposalImpersonateConfirmBPhoneDark: Story = () => <ImpersonateConfirmB />;
ProposalImpersonateConfirmBPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const ProposalImpersonateConfirmBPhoneLight: Story = () => <ImpersonateConfirmB />;
ProposalImpersonateConfirmBPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

// 1d.5, Pause. A (recommended): today, the owner's MB.63 call: Pause acts at
// once, since pausing takes nothing away and Resume is the way back.
const PauseConfirmA = () => (
  <Frame>
    <PageHeader title="Users" action={<PauseControl paused={false} canToggle />} />
  </Frame>
);

export const ProposalPauseConfirmA: Story = () => <PauseConfirmA />;

export const ProposalPauseConfirmAPhoneDark: Story = () => <PauseConfirmA />;
ProposalPauseConfirmAPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalPauseConfirmAPhoneLight: Story = () => <PauseConfirmA />;
ProposalPauseConfirmAPhoneLight.meta = { theme: 'light', width: 375 };

// 1d.5, Pause. B: Pause asks first, saying whom it stops. Reverses the owner's
// MB.63 call, so the comment flags it.
const PauseConfirmB = () => (
  <Modal title="Pause Admin Changes" onClose={() => {}}>
    {(close) => (
      <>
        <p>
          Pause admin changes? Until you resume them, no other admin can grant or revoke admin,
          approve or revoke coven creation, or invite an admin.
        </p>
        <div className="modal__actions">
          <button className="btn btn--destructive" type="button">
            Pause Admin Changes
          </button>
          <button className="btn btn--quiet" type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </>
    )}
  </Modal>
);

export const ProposalPauseConfirmB: Story = () => <PauseConfirmB />;
ProposalPauseConfirmB.meta = { iframed: true };

export const ProposalPauseConfirmBPhoneDark: Story = () => <PauseConfirmB />;
ProposalPauseConfirmBPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const ProposalPauseConfirmBPhoneLight: Story = () => <PauseConfirmB />;
ProposalPauseConfirmBPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

// 1d.12, the Reason field in Grant's confirmation (and Approve's, Revoke's and
// the invite form's). A (recommended): the hint behind an InfoTip, as
// styling.md's hint rule has it, the label saying it is optional.
const REASON_HINT = 'Kept with the change in the record of who changed what.';

const ReasonField = ({ tip }: { tip: boolean }) => {
  const { aria, ...field } = fieldDescription({
    id: tip ? 'proposal-reason-tip' : 'proposal-reason-visible',
    ...(tip ? { hint: REASON_HINT } : { note: REASON_HINT }),
  });
  return (
    <Modal title="Grant Admin" onClose={() => {}}>
      {(close) => (
        <>
          <p>
            Make <strong>Bo Fixturewort</strong> an admin? Admins curate the compendium and its
            lists, and can grant and revoke admin. They will also be able to create covens.
          </p>
          <div className="user-list__note">
            <FieldShell label={tip ? 'Reason (Optional)' : 'Reason'} {...field}>
              <input
                id={field.controlId}
                className="input"
                type="text"
                autoComplete="off"
                {...aria}
              />
            </FieldShell>
          </div>
          <div className="modal__actions">
            <button className="btn btn--solid" type="button">
              Grant
            </button>
            <button className="btn btn--quiet" type="button" onClick={close}>
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export const ProposalReasonTipA: Story = () => <ReasonField tip />;
ProposalReasonTipA.meta = { iframed: true };

export const ProposalReasonTipAPhoneDark: Story = () => <ReasonField tip />;
ProposalReasonTipAPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const ProposalReasonTipAPhoneLight: Story = () => <ReasonField tip />;
ProposalReasonTipAPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

// 1d.12 B: today, the hint as a line in view beneath the label.
export const ProposalReasonVisibleB: Story = () => <ReasonField tip={false} />;
ProposalReasonVisibleB.meta = { iframed: true };

export const ProposalReasonVisibleBPhoneDark: Story = () => <ReasonField tip={false} />;
ProposalReasonVisibleBPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const ProposalReasonVisibleBPhoneLight: Story = () => <ReasonField tip={false} />;
ProposalReasonVisibleBPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
