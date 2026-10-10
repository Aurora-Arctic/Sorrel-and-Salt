import type { Story } from '@ladle/react';
import type { PropsWithChildren } from 'react';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import AdminInvitations from '.';
import type { AdminInvitationEntry } from './types';

// Render-only; behaviour is asserted in tests/components/AdminInvitations.
// Invite and Revoke talk to the network only when sent, so nothing is mocked:
// a send in the workshop fails into its alert, which is itself a state worth
// seeing.
export default {
  title: 'Admin / Admin Invitations',
};

const INVITATIONS: AdminInvitationEntry[] = [
  {
    id: 'i1',
    email: 'ada@example.test',
    note: 'Curates the resins',
    expiresAt: new Date('2026-10-17T20:05:00Z'),
  },
  {
    id: 'i2',
    email: 'brook.fixturewort@example.test',
    note: null,
    expiresAt: new Date('2026-10-16T09:00:00Z'),
  },
];

// The admin layout's frame, as the user list's stories draw it.
const Frame = ({ children }: PropsWithChildren) => (
  <div className="admin-layout">
    <main>{children}</main>
  </div>
);

export const Pending: Story = () => (
  <Frame>
    <AdminInvitations invitations={INVITATIONS} />
  </Frame>
);

export const NoneWaiting: Story = () => (
  <Frame>
    <AdminInvitations invitations={[]} />
  </Frame>
);

// Paused, to an admin who is not the primary one: Invite Admin and every
// Revoke in view but locked, the pause as the reason in a tip.
export const Paused: Story = () => (
  <Frame>
    <AdminInvitations invitations={INVITATIONS} locked={ADMIN_CHANGES_PAUSED_REFUSAL} />
  </Frame>
);
