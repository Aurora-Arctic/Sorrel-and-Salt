import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '../TabbedPage';
import UserList, { PauseControl } from '.';
import type { UserListEntry } from './types';

/**
 * A row as the page builds it: its name opens the user's modal (M9.19), an
 * address the workshop does not serve, under the head the page gives it.
 */
const listed = (user: Omit<UserListEntry, 'openHref' | 'heading'>): UserListEntry => ({
  ...user,
  openHref: '#user',
  heading: {
    eyebrow: 'User',
    title: user.name,
    qualifier: <span className="user-list__modal-email">{user.email}</span>,
  },
});

// Render-only; behaviour is asserted in tests/components/UserList. The filter
// and the pager reach `/admin/users`, and each name's privilege changes icon
// `/admin/privilege-changes` (MB.200), neither of which the workshop serves;
// hover or focus an icon to see its tip.
const meta = {
  title: 'Admin / User List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const USERS: readonly UserListEntry[] = [
  listed({
    id: 'u-ada',
    name: 'Ada Fixturewort',
    email: 'ada@users.test',
    role: 'admin',
    canCreateWorkspace: true,
    createdAt: new Date('2026-03-04T05:06:07Z'),
    providers: ['discord', 'google'],
    emailVerified: true,
    primaryAdmin: false,
  }),
  listed({
    id: 'u-bo',
    name: 'Bo Fixturewort',
    email: 'bo@users.test',
    role: 'user',
    canCreateWorkspace: false,
    createdAt: new Date('2026-05-06T07:08:09Z'),
    providers: ['microsoft'],
    emailVerified: false,
    primaryAdmin: false,
  }),
  // Approved, so the row offers Revoke rather than Approve (M5.8).
  listed({
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
  }),
];

// Each story sits inside the admin layout's frame and the People page, its
// Users tab open, so the workshop shows what the page shows: the switch on
// admin changes, where a story gives it, beside the heading as the tab's
// action.

// The page as /admin/users draws it where impersonation is registered
// (MB.53): the seven columns as signed off at MB.115, the facts no control
// changes muted, Impersonate ruled in red at the right. Impersonate and Pause
// Admin Changes each ask first; in the workshop the call reaches no server,
// so confirming shows the refusal.
// Drawn inside the app shell, so the phone shows the header and the bottom bar the admin nav
// moves to; the other states draw the admin frame alone.
const defaultNode = (
  <ShellFrame area="admin">
    <TabbedPage
      title={ADMIN_PAGES.people.label}
      tabs={ADMIN_PAGES.people.tabs}
      action={<PauseControl paused={false} canToggle={false} />}
    >
      <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
    </TabbedPage>
  </ShellFrame>
);

// The same page for the primary admin, the one admin who may pause: the switch
// is a usable red Pause Admin Changes rather than the dashed, locked resting button.
const primaryAdminNode = (
  <AdminTabbedFrame page="people" action={<PauseControl paused={false} canToggle />}>
    <UserList users={USERS} query="" awaitingApproval={false} canImpersonate nextHref="#next" />
  </AdminTabbedFrame>
);

const FilteredView = () => (
  <AdminTabbedFrame page="people">
    <UserList
      users={USERS.filter((user) => !user.canCreateWorkspace)}
      query="fixturewort"
      awaitingApproval
      previousHref="#previous"
    />
  </AdminTabbedFrame>
);

const filteredNode = <FilteredView />;

// A middle page of a list longer than one: the page's 25, by name, and the
// pager beneath them, both ends live and where the page stands between.
const PAGE_TWO: readonly UserListEntry[] = Array.from({ length: 25 }, (_, index) =>
  listed({
    id: `u-page-${index + 26}`,
    name: `Fixturewort ${index + 26}`,
    email: `fixturewort${index + 26}@users.test`,
    role: 'user',
    canCreateWorkspace: index % 4 !== 0,
    createdAt: new Date(Date.UTC(2026, 2, 4) + index * 86_400_000),
    providers: index % 2 === 0 ? ['google'] : ['discord'],
    emailVerified: true,
    primaryAdmin: false,
  }),
);
const PageTwo = (): ReactElement => (
  <AdminTabbedFrame page="people" action={<PauseControl paused={false} canToggle />}>
    <UserList
      users={PAGE_TWO}
      query=""
      awaitingApproval={false}
      previousHref="#previous"
      nextHref="#next"
      position={{ page: 2, pages: 3 }}
    />
  </AdminTabbedFrame>
);

const middlePageNode = <PageTwo />;

// Every filter in use, which the sentence names. Spread, since a `role` attribute reads to the linter as an ARIA role.
const EVERY_FILTER = { query: 'nobody', role: 'admin', awaitingApproval: true } as const;

const roleFilterNode = (
  <AdminTabbedFrame page="people">
    <UserList
      users={USERS.filter((user) => user.role === 'admin')}
      query=""
      role="admin"
      awaitingApproval={false}
    />
  </AdminTabbedFrame>
);

const noMatchesNode = (
  <AdminTabbedFrame page="people">
    <UserList users={[]} {...EVERY_FILTER} />
  </AdminTabbedFrame>
);

// Where impersonation is not registered: no Impersonate column.
const withoutImpersonationNode = (
  <AdminTabbedFrame page="people">
    <UserList users={USERS} query="" awaitingApproval={false} />
  </AdminTabbedFrame>
);

// MB.205: two users awaiting approval, one unverified and one verified. Approve
// on the first opens a confirmation warning that nobody has proved who holds
// the address; on the second, none.
const unverifiedApprovalNode = (
  <AdminTabbedFrame page="people">
    <UserList
      users={[
        USERS[1] as UserListEntry,
        listed({
          id: 'u-di',
          name: 'Di Fixturewort',
          email: 'di@users.test',
          role: 'user',
          canCreateWorkspace: false,
          createdAt: new Date('2026-07-08T09:10:11Z'),
          providers: ['discord'],
          emailVerified: true,
          primaryAdmin: false,
        }),
      ]}
      query=""
      awaitingApproval
    />
  </AdminTabbedFrame>
);

// MB.59, M11.20: the primary admin, labelled, its Change Role in view but
// unusable with the reason beside it; every other row's Change Role opens its
// choice of the roles the user does not hold, a promotion warning on Bo's
// unverified address. Dee is a curator, in bold as an admin is, with no
// coven-creation control, since every curator holds it.
const adminRolesNode = (
  <AdminTabbedFrame page="people">
    <UserList
      users={[
        { ...(USERS[0] as UserListEntry), primaryAdmin: true },
        listed({
          id: 'u-eve',
          name: 'Eve Fixturewort',
          email: 'eve@users.test',
          role: 'admin',
          canCreateWorkspace: true,
          createdAt: new Date('2026-08-09T10:11:12Z'),
          providers: ['google'],
          emailVerified: true,
          primaryAdmin: false,
        }),
        listed({
          id: 'u-dee',
          name: 'Dee Fixturewort',
          email: 'dee@users.test',
          role: 'curator',
          canCreateWorkspace: true,
          createdAt: new Date('2026-08-10T11:12:13Z'),
          providers: ['discord'],
          emailVerified: true,
          primaryAdmin: false,
        }),
        ...USERS.slice(1),
      ]}
      query=""
      awaitingApproval={false}
    />
  </AdminTabbedFrame>
);

// MB.63: the switch as the Users tab's action beside the heading, as /admin/users draws it. Paused, to the primary admin: the warning and a
// usable Resume, and every row's control usable, since the pause exempts it.
const adminChangesPausedNode = (
  <AdminTabbedFrame page="people" action={<PauseControl paused canToggle />}>
    <UserList
      users={USERS}
      query=""
      awaitingApproval={false}
      adminChanges={{ paused: true, canToggle: true }}
    />
  </AdminTabbedFrame>
);

// Paused, to another admin: the warning, Resume locked with its reason in a
// tip, and every Change Role, Approve and coven-creation Revoke locked with
// the pause's reason.
const adminChangesNotPrimaryNode = (
  <AdminTabbedFrame page="people" action={<PauseControl paused canToggle={false} />}>
    <UserList
      users={USERS}
      query=""
      awaitingApproval={false}
      adminChanges={{ paused: true, canToggle: false }}
    />
  </AdminTabbedFrame>
);

const LISTED_STATES: Record<string, ReactNode> = {
  'Without Filters': defaultNode,
  'Primary Admin': primaryAdminNode,
  'Awaiting Approval And Query': filteredNode,
  'Middle Page': middlePageNode,
  'Role Filter': roleFilterNode,
  'No Matches': noMatchesNode,
  'Without Impersonation': withoutImpersonationNode,
  'Unverified Approval': unverifiedApprovalNode,
  'Admin Roles': adminRolesNode,
  'Admin Changes Paused': adminChangesPausedNode,
  'Admin Changes Not Primary': adminChangesNotPrimaryNode,
};

export const States: Story = {
  args: { state: 'Without Filters' },
  argTypes: {
    state: { control: 'select', options: Object.keys(LISTED_STATES), mapping: LISTED_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
