import type { Story } from '@ladle/react';
import type { PropsWithChildren } from 'react';
import UserList from '.';
import type { UserListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/UserList. The filter
// and the pager reach `/admin/users`, which the workshop does not serve.
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
  },
  // Approved, so the row offers Revoke rather than Approve (M5.8).
  {
    id: 'u-cy',
    name: 'Cy Fixturewort',
    email: 'cy@users.test',
    role: 'user',
    canCreateWorkspace: true,
    createdAt: new Date('2026-06-07T08:09:10Z'),
    providers: ['google'],
    emailVerified: true,
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
        },
      ]}
      query=""
      awaitingApproval
    />
  </Frame>
);
