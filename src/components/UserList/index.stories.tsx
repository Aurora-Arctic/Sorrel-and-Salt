import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '../TabbedPage';
import UserList, { PauseControl } from '.';
import type { UserListEntry } from './types';

const listed = (user: Omit<UserListEntry, 'openHref' | 'heading'>): UserListEntry => ({
  ...user,
  openHref: '#user',
  heading: {
    eyebrow: 'User',
    title: user.name,
    qualifier: <span className="user-list__modal-email">{user.email}</span>,
  },
});

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
    agreedTermsVersion: 1,
    agreedDisclaimerVersion: 1,
    agreedEthicsVersion: 1,
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
    agreedTermsVersion: null,
    agreedDisclaimerVersion: null,
    agreedEthicsVersion: null,
    providers: ['microsoft'],
    emailVerified: false,
    primaryAdmin: false,
  }),
  listed({
    id: 'u-cy',
    name: 'Cy Fixturewort',
    email: 'cy@users.test',
    role: 'user',
    canCreateWorkspace: true,
    createdAt: new Date('2026-06-07T08:09:10Z'),
    agreedTermsVersion: 1,
    agreedDisclaimerVersion: 1,
    agreedEthicsVersion: 1,
    providers: ['facebook', 'google'],
    emailVerified: true,
    primaryAdmin: false,
  }),
];

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

const PAGE_TWO: readonly UserListEntry[] = Array.from({ length: 25 }, (_, index) =>
  listed({
    id: `u-page-${index + 26}`,
    name: `Fixturewort ${index + 26}`,
    email: `fixturewort${index + 26}@users.test`,
    role: 'user',
    canCreateWorkspace: index % 4 !== 0,
    createdAt: new Date(Date.UTC(2026, 2, 4) + index * 86_400_000),
    agreedTermsVersion: 1,
    agreedDisclaimerVersion: 1,
    agreedEthicsVersion: 1,
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

const withoutImpersonationNode = (
  <AdminTabbedFrame page="people">
    <UserList users={USERS} query="" awaitingApproval={false} />
  </AdminTabbedFrame>
);

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
          agreedTermsVersion: 1,
          agreedDisclaimerVersion: 1,
          agreedEthicsVersion: 1,
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
          agreedTermsVersion: 1,
          agreedDisclaimerVersion: 1,
          agreedEthicsVersion: 1,
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

const adminChangesPausedNode = (
  <AdminTabbedFrame page="people" action={<PauseControl paused canToggle />}>
    <UserList users={USERS} query="" awaitingApproval={false} />
  </AdminTabbedFrame>
);

const adminChangesNotPrimaryNode = (
  <AdminTabbedFrame page="people" action={<PauseControl paused canToggle={false} />}>
    <UserList users={USERS} query="" awaitingApproval={false} />
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
  'Admin Roles': adminRolesNode,
  'Keeper Changes Paused': adminChangesPausedNode,
  'Keeper Changes Not Primary': adminChangesNotPrimaryNode,
};

export const States: Story = {
  args: { state: 'Without Filters' },
  argTypes: {
    state: { control: 'select', options: Object.keys(LISTED_STATES), mapping: LISTED_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
