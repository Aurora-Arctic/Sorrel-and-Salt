import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '../TabbedPage';
import UserList, { PauseControl } from '.';
import type { UserListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/UserList. The filter
// and the pager reach `/admin/users`, and each name's privilege changes icon
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

// Inside the admin layout's frame and the People page, its Users tab open
// (the workshop's address), so the workshop shows what the page shows: the
// switch on admin changes, where a story gives it, beside the heading as the
// tab's action.
const Frame = ({ action, children }: { action?: ReactNode; children: ReactNode }): ReactElement => (
  <div className="admin-layout">
    <TabbedPage title={ADMIN_PAGES.people.label} tabs={ADMIN_PAGES.people.tabs} action={action}>
      {children}
    </TabbedPage>
  </div>
);

// The page as /admin/users draws it where impersonation is registered
// (MB.53): the seven columns as signed off at MB.115, the facts no control
// changes muted, Impersonate ruled in red at the right. Impersonate and Pause
// Admin Changes each ask first; in the workshop the call reaches no server,
// so confirming shows the refusal.
export const Default: Story = () => (
  <Frame action={<PauseControl paused={false} canToggle />}>
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
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

// A middle page of a list longer than one: the page's 25, by name, and the
// pager beneath them, both ends live and where the page stands between.
const PAGE_TWO: readonly UserListEntry[] = Array.from({ length: 25 }, (_, index) => ({
  id: `u-page-${index + 26}`,
  name: `Fixturewort ${index + 26}`,
  email: `fixturewort${index + 26}@users.test`,
  role: 'user',
  canCreateWorkspace: index % 4 !== 0,
  createdAt: new Date(Date.UTC(2026, 2, 4) + index * 86_400_000),
  providers: index % 2 === 0 ? ['google'] : ['discord'],
  emailVerified: true,
  primaryAdmin: false,
}));
const PageTwo = (): ReactElement => (
  <Frame action={<PauseControl paused={false} canToggle />}>
    <UserList
      users={PAGE_TWO}
      query=""
      awaitingApproval={false}
      previousHref="#previous"
      nextHref="#next"
      position={{ page: 2, pages: 3 }}
    />
  </Frame>
);

export const OnePageOfSeveral: Story = () => <PageTwo />;

// A middle page at phone width: the pager beneath the last card.
export const OnePageOfSeveralPhoneDark: Story = () => <PageTwo />;
OnePageOfSeveralPhoneDark.meta = { theme: 'dark', width: 375 };

export const OnePageOfSeveralPhoneLight: Story = () => <PageTwo />;
OnePageOfSeveralPhoneLight.meta = { theme: 'light', width: 375 };

// Every filter in use, which the sentence names. Spread, since a `role` attribute reads to the linter as an ARIA role.
const EVERY_FILTER = { query: 'nobody', role: 'admin', awaitingApproval: true } as const;

export const NoMatch: Story = () => (
  <Frame>
    <UserList users={[]} {...EVERY_FILTER} />
  </Frame>
);

// Where impersonation is not registered: no Impersonate column.
export const WithoutImpersonation: Story = () => (
  <Frame>
    <UserList users={USERS} query="" awaitingApproval={false} />
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

// MB.63: the switch as the Users tab's action beside the heading, as /admin/users draws it. Paused, to the primary admin: the warning and a
// usable Resume, and every row's control usable, since the pause exempts it.
export const AdminChangesPaused: Story = () => (
  <Frame action={<PauseControl paused canToggle />}>
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
  <Frame action={<PauseControl paused canToggle={false} />}>
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
  <Frame action={<PauseControl paused={false} canToggle />}>
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
  </Frame>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <Frame action={<PauseControl paused={false} canToggle />}>
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
  </Frame>
);
PhoneLight.meta = { theme: 'light', width: 375 };

// The filtered list at a phone's width, Clear beside Filter.
export const FilteredPhoneDark: Story = () => <Filtered />;
FilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const FilteredPhoneLight: Story = () => <Filtered />;
FilteredPhoneLight.meta = { theme: 'light', width: 375 };
