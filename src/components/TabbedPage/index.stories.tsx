import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import AdminInvitations from '../AdminInvitations';
import type { AdminInvitationEntry } from '../AdminInvitations/types';
import AdminNav from '../AdminNav';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '.';
import { TabSwitchContext } from './tab-switch';

// Render-only; behaviour is asserted in tests/components/TabbedPage. The
// People page as `/admin/invitations` draws it: the admin layout's frame and
// nav, the page's heading and its three tabs with Invitations open, and the
// tab's own content beneath, Invite Admin at the end of its line. The
// workshop's stub says which address is open (.ladle/navigation.ts), and
// a tab switch provided above the page says a tab is on its way, since the
// stub router goes nowhere.
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

const ON_ITS_WAY = { pending: true, go: () => undefined };

const People = ({ children }: { children: ReactNode }): ReactElement => (
  <WorkshopPathname.Provider value="/admin/invitations">
    <div className="admin-layout">
      <AdminNav />
      <TabbedPage title={ADMIN_PAGES.people.label} tabs={ADMIN_PAGES.people.tabs}>
        {children}
      </TabbedPage>
    </div>
  </WorkshopPathname.Provider>
);

const Invitations = () => (
  <People>
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);

// Another tab pressed and on its way: the heading where it was, every
// tab greyed out and closed to another press, and the panel's loading state
// in place of the invitations, which fades in after a moment so a quick tab
// never flashes it.
const Loading = () => (
  <TabSwitchContext.Provider value={ON_ITS_WAY}>
    <Invitations />
  </TabSwitchContext.Provider>
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
