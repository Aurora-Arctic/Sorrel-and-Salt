import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PendingInvitations from '.';
import type { PendingInvitationEntry } from './types';

// Render-only; behaviour is asserted in tests/components/PendingInvitations.
const meta = {
  title: 'Coven / Invitations Sent',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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

export const Default: Story = {
  render: () => <PendingInvitations workspaceId="w" invitations={INVITATIONS} />,
};

const WithDeclinedView = () => (
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

export const WithDeclined: Story = { render: WithDeclinedView };

export const Empty: Story = {
  render: () => <PendingInvitations workspaceId="w" invitations={[]} />,
};
