import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import { WorkshopPathname } from '../../../.ladle/navigation';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '../TabbedPage';
import AdminInvitations, { InviteAdmin } from '.';
import type { AdminInvitationEntry, AdminInvitationsProps } from './types';

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

// The admin layout's frame and the People page with its Invitations tab
// open, as /admin/invitations draws them: Invite Admin beside the heading as
// the tab's action, the list beneath.
const Frame = ({ invitations, locked, inviting }: AdminInvitationsProps): ReactElement => (
  <WorkshopPathname.Provider value="/admin/invitations">
    <div className="admin-layout">
      <TabbedPage
        title={ADMIN_PAGES.people.label}
        tabs={ADMIN_PAGES.people.tabs}
        action={<InviteAdmin locked={locked} />}
      >
        <AdminInvitations invitations={invitations} locked={locked} inviting={inviting} />
      </TabbedPage>
    </div>
  </WorkshopPathname.Provider>
);

export const Pending: Story = () => <Frame invitations={INVITATIONS} />;

export const NoneWaiting: Story = () => <Frame invitations={[]} />;

// Invite Admin pressed: the form `?invite` opens over the list.
export const Inviting: Story = () => <Frame invitations={INVITATIONS} inviting />;

// Paused, to an admin who is not the primary one: Invite Admin and every
// Revoke in view but locked, the pause as the reason in a tip.
export const Paused: Story = () => (
  <Frame invitations={INVITATIONS} locked={ADMIN_CHANGES_PAUSED_REFUSAL} />
);

// At phone width: Invite Admin across the line beneath the heading, and each
// invitation a card, Revoke across its foot.
export const PhoneDark: Story = () => <Frame invitations={INVITATIONS} />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Frame invitations={INVITATIONS} />;
PhoneLight.meta = { theme: 'light', width: 375 };
