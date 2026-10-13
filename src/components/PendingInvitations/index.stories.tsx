import type { Story } from '@ladle/react';
import PendingInvitations from '.';
import type { PendingInvitationEntry } from './types';

// Render-only; behaviour is asserted in tests/components/PendingInvitations.
export default {
  title: 'Coven / Pending Invitations',
};

const INVITATIONS: readonly PendingInvitationEntry[] = [
  {
    id: 'i-1',
    email: 'fern@fixture.test',
    role: 'member',
    expiresAt: new Date('2026-10-19'),
    declinedAt: null,
  },
  {
    id: 'i-2',
    email: 'moss@fixture.test',
    role: 'viewer',
    expiresAt: new Date('2026-10-18'),
    declinedAt: null,
  },
];

export const Listed: Story = () => <PendingInvitations workspaceId="w" invitations={INVITATIONS} />;

export const WithDeclined: Story = () => (
  <PendingInvitations
    workspaceId="w"
    invitations={[
      ...INVITATIONS,
      {
        id: 'i-3',
        email: 'sage@fixture.test',
        role: 'viewer',
        expiresAt: new Date('2026-10-20'),
        declinedAt: new Date('2026-10-14T09:30:00Z'),
      },
    ]}
  />
);

export const Empty: Story = () => <PendingInvitations workspaceId="w" invitations={[]} />;
