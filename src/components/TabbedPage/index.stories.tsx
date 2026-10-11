import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import AdminInvitations, { InviteAdmin } from '../AdminInvitations';
import type { AdminInvitationEntry } from '../AdminInvitations/types';
import AdminNav from '../AdminNav';
import { ADMIN_PAGES } from '../AdminNav/sections';
import UserList, { PauseControl } from '../UserList';
import type { UserListEntry } from '../UserList/types';
import TabbedPage from '.';
import { TabSwitchContext } from './tab-switch';
import type { TabSwitch } from './types';
import './proposals.scss';

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

// MB.115's three proposals for the tab row's look (the owner's call: today's
// row reads as links rather than tabs), each on the People page with Users
// open and its switch beside the heading. Story-only: `proposals.scss`
// restyles the real markup under a wrapper class, and these stories and that
// file are deleted at sign-off. Each has a desktop story, a 375px pair, a
// `States` story with Invitations hovered and Privilege Changes focused from
// the keyboard, and a `Pending` story with Invitations on its way and every
// tab greyed.

const PROPOSAL_USERS: readonly UserListEntry[] = [
  {
    id: 'u-ada',
    name: 'Ada Fixturewort',
    email: 'ada@users.test',
    role: 'admin',
    canCreateWorkspace: true,
    createdAt: new Date('2026-03-04T05:06:07Z'),
    providers: ['discord', 'google'],
    emailVerified: true,
    primaryAdmin: false,
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
    primaryAdmin: false,
  },
];

const INVITATIONS_ON_ITS_WAY: TabSwitch = {
  pending: true,
  target: ADMIN_PAGES.people.tabs[1],
  go: () => undefined,
};

type ProposalKind = 'underline' | 'folder' | 'segmented';

const UsersPage = ({ kind, states = false }: { kind: ProposalKind; states?: boolean }) => (
  <WorkshopPathname.Provider value="/admin/users">
    <div className="admin-layout">
      <AdminNav />
      <div
        className={`tabs-proposal tabs-proposal--${kind}${states ? ' tabs-proposal--states' : ''}`}
      >
        <TabbedPage
          title={ADMIN_PAGES.people.label}
          tabs={ADMIN_PAGES.people.tabs}
          action={<PauseControl paused={false} canToggle />}
        >
          <UserList users={PROPOSAL_USERS} query="" awaitingApproval={false} />
        </TabbedPage>
      </div>
    </div>
  </WorkshopPathname.Provider>
);

const Proposal = ({ kind, view }: { kind: ProposalKind; view?: 'states' | 'pending' }) =>
  view === 'pending' ? (
    <TabSwitchContext.Provider value={INVITATIONS_ON_ITS_WAY}>
      <UsersPage kind={kind} />
    </TabSwitchContext.Provider>
  ) : (
    <UsersPage kind={kind} states={view === 'states'} />
  );

// 1. The open tab carries a heavy accent bar along its foot, on the row's
// full-width hairline; the others in the muted ink, darkening on hover.
export const ProposalTabsUnderlineBar: Story = () => <Proposal kind="underline" />;

export const ProposalTabsUnderlineBarPhoneDark: Story = () => <Proposal kind="underline" />;
ProposalTabsUnderlineBarPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalTabsUnderlineBarPhoneLight: Story = () => <Proposal kind="underline" />;
ProposalTabsUnderlineBarPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalTabsUnderlineBarStates: Story = () => (
  <Proposal kind="underline" view="states" />
);

export const ProposalTabsUnderlineBarPending: Story = () => (
  <Proposal kind="underline" view="pending" />
);

// 2. Folder tabs: the open tab on the card surface, joined to a card-surface
// panel beneath with no line between; the others on the page ground behind
// it. The user list's banded rows sit on the same card surface here, so a
// band would need another fill if this wins.
export const ProposalTabsFolder: Story = () => <Proposal kind="folder" />;

export const ProposalTabsFolderPhoneDark: Story = () => <Proposal kind="folder" />;
ProposalTabsFolderPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalTabsFolderPhoneLight: Story = () => <Proposal kind="folder" />;
ProposalTabsFolderPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalTabsFolderStates: Story = () => <Proposal kind="folder" view="states" />;

export const ProposalTabsFolderPending: Story = () => <Proposal kind="folder" view="pending" />;

// 3. A segmented control: one rounded track on the card surface, the open
// tab a raised pill inside it; at 375px the track spans the line and the
// three segments share it.
export const ProposalTabsSegmented: Story = () => <Proposal kind="segmented" />;

export const ProposalTabsSegmentedPhoneDark: Story = () => <Proposal kind="segmented" />;
ProposalTabsSegmentedPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalTabsSegmentedPhoneLight: Story = () => <Proposal kind="segmented" />;
ProposalTabsSegmentedPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalTabsSegmentedStates: Story = () => <Proposal kind="segmented" view="states" />;

export const ProposalTabsSegmentedPending: Story = () => (
  <Proposal kind="segmented" view="pending" />
);
