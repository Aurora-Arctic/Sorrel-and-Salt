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
      users={USERS.slice(1)}
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
