import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import AdminInvitations, { InviteAdmin } from '../AdminInvitations';
import type { AdminInvitationEntry } from '../AdminInvitations/types';
import AdminNav from '../AdminNav';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '.';
import { TabSwitchContext } from './tab-switch';
import type { TabSwitch } from './types';

// Render-only; behaviour is asserted in tests/components/TabbedPage. The
// People page as `/admin/invitations` draws it: the admin layout's frame and
// nav, the page's heading with the open tab's Invite Admin at the end of its
// line, its three tabs with Invitations open, and the tab's own content
// beneath. The
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

// Users pressed and on its way, a tab whose list opens with a filter.
const ON_ITS_WAY = { pending: true, target: ADMIN_PAGES.people.tabs[0], go: () => undefined };

const People = ({ children }: { children: ReactNode }): ReactElement => (
  <WorkshopPathname.Provider value="/admin/invitations">
    <div className="admin-layout">
      <AdminNav />
      <TabbedPage
        title={ADMIN_PAGES.people.label}
        tabs={ADMIN_PAGES.people.tabs}
        action={<InviteAdmin />}
      >
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

// Users pressed and on its way: the heading where it was, Invite Admin and
// every tab greyed out and closed to another press, and in place of the
// invitations the skeleton of the list on its way, its filter row, a table's
// heading and six rows, and the pager, shimmering. At 375px the rows are
// cards. Under reduced motion the shapes stand still.
const Loading = ({ tab = ON_ITS_WAY }: { tab?: TabSwitch }) => (
  <TabSwitchContext.Provider value={tab}>
    <Invitations />
  </TabSwitchContext.Provider>
);

export const Default: Story = () => <Invitations />;

// At a phone's width in each theme: the nav's disclosure, Invite Admin across
// the line beneath the heading, the tabs wrapping and each invitation a card.
export const PhoneDark: Story = () => <Invitations />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Invitations />;
PhoneLight.meta = { theme: 'light', width: 375 };

export const LoadingState: Story = () => <Loading />;

export const LoadingPhoneDark: Story = () => <Loading />;
LoadingPhoneDark.meta = { theme: 'dark', width: 375 };

export const LoadingPhoneLight: Story = () => <Loading />;
LoadingPhoneLight.meta = { theme: 'light', width: 375 };

// A tab whose content opens with no filter on its way, Invitations: the same
// skeleton without the filter row.
export const LoadingUnfiltered: Story = () => (
  <Loading tab={{ ...ON_ITS_WAY, target: ADMIN_PAGES.people.tabs[1] }} />
);
