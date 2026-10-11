import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import { WorkshopPendingHref } from '../../../.ladle/UnoptimizedLink';
import AdminInvitations from '../AdminInvitations';
import type { AdminInvitationEntry } from '../AdminInvitations/types';
import AdminNav from '../AdminNav';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage, { TabPanelLoading } from '.';

// Render-only; behaviour is asserted in tests/components/TabbedPage. The
// People page as `/admin/invitations` draws it: the admin layout's frame and
// nav, the page's heading and its three tabs with Invitations open, and the
// tab's own content beneath, Invite Admin at the end of its line. The
// workshop's stubs say which address is open and which tab is on its way
// (.ladle/navigation.ts, .ladle/UnoptimizedLink.tsx).
export default {
  title: 'Admin / Tabbed Page',
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

const People = ({ pending, children }: { pending?: string; children: ReactNode }): ReactElement => (
  <WorkshopPathname.Provider value="/admin/invitations">
    <WorkshopPendingHref.Provider value={pending}>
      <div className="admin-layout">
        <AdminNav />
        <TabbedPage title={ADMIN_PAGES.people.label} tabs={ADMIN_PAGES.people.tabs}>
          {children}
        </TabbedPage>
      </div>
    </WorkshopPendingHref.Provider>
  </WorkshopPathname.Provider>
);

const Invitations = () => (
  <People>
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);

// The panel while the tab just pressed loads: the heading and the tabs where
// they were, Invitations already marked open, and the loading state, which
// fades in after a moment so a quick tab never flashes it.
const Loading = () => (
  <People>
    <TabPanelLoading />
  </People>
);

export const Default: Story = () => <Invitations />;

// At a phone's width in each theme: the nav's disclosure, the tabs wrapping,
// Invite Admin across the line and each invitation a card.
export const PhoneDark: Story = () => <Invitations />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Invitations />;
PhoneLight.meta = { theme: 'light', width: 375 };

export const LoadingState: Story = () => <Loading />;

export const LoadingPhoneDark: Story = () => <Loading />;
LoadingPhoneDark.meta = { theme: 'dark', width: 375 };

export const LoadingPhoneLight: Story = () => <Loading />;
LoadingPhoneLight.meta = { theme: 'light', width: 375 };

// Privilege Changes pressed before its loading state was fetched ahead: the
// spinner after its label until the address moves, the open tab and its
// content as they were.
export const TabPending: Story = () => (
  <People pending="/admin/privilege-changes">
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);
