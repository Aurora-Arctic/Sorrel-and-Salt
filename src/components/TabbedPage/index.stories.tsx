import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import AddAction from '../../app/(shell)/admin/add-action';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { INVITATIONS } from '../../../.storybook/fixtures';
import AdminInvitations, { InviteAdmin } from '../AdminInvitations';
import { ADMIN_PAGES } from '../AdminNav/sections';
import PrivilegeLedger from '../PrivilegeLedger';
import { TabSwitchContext } from './tab-switch';
import type { TabSwitch } from './types';

// Render-only; behaviour is asserted in tests/components/TabbedPage. The
// People page as `/admin/invitations` draws it: the admin layout's frame and
// nav, the page's heading with its three tabs beside it, Invitations open, and
// the open tab's New Invitation at the end of the line, then the tab's own content
// beneath. The workshop's stub says which address is open (.storybook/navigation.ts), and
// a tab switch provided above the page says a tab is on its way, since the
// stub router goes nowhere.
const meta = {
  title: 'Layout / Tabbed Page',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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
  <AdminTabbedFrame page="people" open={open} action={action}>
    {children}
  </AdminTabbedFrame>
);

const Invitations = () => (
  <People>
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);

// Users pressed and on its way: the heading where it was, New Invitation and
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

export const Default: Story = { render: () => <Invitations /> };

export const LoadingState: Story = { render: () => <Loading /> };

// A tab whose content opens with no filter on its way, Invitations: the same
// skeleton without the filter row.
export const LoadingUnfiltered: Story = {
  render: () => <Loading tab={{ ...ON_ITS_WAY, target: ADMIN_PAGES.people.tabs[1] }} />,
};

// The last tab open, Privilege Changes, at 375px: the three pills fit under
// the heading, and a row too wide for its line would scroll inside its track
// to centre the open tab. Privilege Changes has no action, so the heading
// line holds the heading and the pills alone.
export const PrivilegeChangesTab: Story = {
  render: () => (
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
  ),
};

// The Add the way a list page draws it (`AddAction`, which has a labelled
// button and a plus for the narrow header), where Default has the plain
// New Invitation link. Open it at 600px wide to see the plus at the heading's
// end with the pills on its line, and at 382px for the label beneath the heading,
// the width at which the plus gives way to it.
export const AddActionLabelAndPlus: Story = {
  render: () => (
    <People
      action={
        <AddAction href="/admin/invitations?invite" heading={{ title: 'New Invitation' }}>
          New Invitation
        </AddAction>
      }
    >
      <AdminInvitations invitations={INVITATIONS} />
    </People>
  ),
};
