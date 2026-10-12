import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { AdminTabbedFrame } from '../../../.ladle/admin-frame';
import { INVITATIONS } from '../../../.ladle/fixtures';
import AdminInvitations, { InviteAdmin } from '../AdminInvitations';
import { ADMIN_PAGES } from '../AdminNav/sections';
import PrivilegeLedger from '../PrivilegeLedger';
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

// Users pressed and on its way, a tab whose list opens with a filter.
const ON_ITS_WAY = { pending: true, target: ADMIN_PAGES.people.tabs[0], go: () => undefined };

const People = ({
  open = '/admin/invitations',
  action = <InviteAdmin />,
  children,
}: {
  open?: string;
  action?: ReactNode;
  children: ReactNode;
}): ReactElement => (
  <AdminTabbedFrame page="people" open={open} action={action} nav>
    {children}
  </AdminTabbedFrame>
);

const Invitations = () => (
  <People>
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);

// Users pressed and on its way: the heading where it was, Invite Admin and
// every tab greyed out and closed to another press, the pill moved to Users
// in its pending look, grey and flat, while Invitations is still the current
// page, and in place of the invitations the skeleton of the list on its
// way, its filter row, a table's heading and six rows, and the pager,
// shimmering. At 375px the rows are cards. Under reduced motion the shapes
// stand still.
const Loading = ({ tab = ON_ITS_WAY }: { tab?: TabSwitch }) => (
  <TabSwitchContext.Provider value={tab}>
    <Invitations />
  </TabSwitchContext.Provider>
);

export const Default: Story = () => <Invitations />;

// At a phone's width in each theme: the nav's disclosure, Invite Admin across
// the line beneath the heading, the tab row's track across the column with
// its three segments running past its end, Invitations centred in view, and
// each invitation a card.
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

// The row scrolled to its far end: Privilege Changes open, its tab the last
// of three that run past the track at 375px, so the page loads with the row
// scrolled inside its track to centre the open tab, Users cut off at the
// start and shaded there. The page itself does not scroll sideways. Privilege
// Changes has no action, so the heading stands alone.
export const PhoneScrolled: Story = () => (
  <People open="/admin/privilege-changes" action={null}>
    <PrivilegeLedger
      filter={{}}
      changes={[
        {
          id: 'c1',
          at: new Date('2026-10-01T09:30:00Z'),
          subject: { name: 'Ada Fixturewort', href: '/admin/users?q=ada' },
          privilege: 'admin',
          change: 'grant',
          via: 'admin',
          actor: { name: 'Bo Fixturewort' },
          note: null,
        },
      ]}
    />
  </People>
);
PhoneScrolled.meta = { width: 375 };
