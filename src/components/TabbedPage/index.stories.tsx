import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import AddAction from '../../app/(shell)/admin/add-action';
import { AdminFrame, AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { INVITATIONS } from '../../../.storybook/fixtures';
import AdminInvitations, { InviteAdmin } from '../AdminInvitations';
import { ADMIN_PAGES } from '../AdminNav/sections';
import PrivilegeLedger from '../PrivilegeLedger';
import TabbedPage from '.';
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
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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

const invitationsNode = <Invitations />;
const loadingStateNode = <Loading />;

// A tab whose content opens with no filter on its way, Invitations: the same
// skeleton without the filter row.
const loadingUnfilteredNode = (
  <Loading tab={{ ...ON_ITS_WAY, target: ADMIN_PAGES.people.tabs[1] }} />
);

// The last tab open, Privilege Changes, at 375px: the three pills fit under
// the heading, and a row too wide for its line would scroll inside its track
// to centre the open tab. Privilege Changes has no action, so the heading
// line holds the heading and the pills alone.
const privilegeChangesTabNode = (
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

// The Add the way a list page draws it (`AddAction`, which has a labelled
// button and a plus for the narrow header), where Default has the plain
// New Invitation link. Open it at 600px wide to see the plus at the heading's
// end with the pills on its line, and at 382px for the label beneath the heading,
// the width at which the plus gives way to it.
const addActionLabelAndPlusNode = (
  <People
    action={
      <AddAction href="/admin/invitations?invite" heading={{ title: 'New Invitation' }}>
        New Invitation
      </AddAction>
    }
  >
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);

// A page with a single tab (a member who cannot invite sees only Members)
// draws no row of pills.
const singleTabNode = (
  <AdminFrame open={ADMIN_PAGES.people.tabs[0].href}>
    <TabbedPage title="People" tabs={[ADMIN_PAGES.people.tabs[0]]}>
      <p>The tab's own content.</p>
    </TabbedPage>
  </AdminFrame>
);

const STATES: Record<string, ReactNode> = {
  'Invitations Tab': invitationsNode,
  'Privilege Changes Tab': privilegeChangesTabNode,
  'Add Action Label And Plus': addActionLabelAndPlusNode,
  'Single Tab': singleTabNode,
  'Loading A Filtered Tab': loadingStateNode,
  'Loading An Unfiltered Tab': loadingUnfilteredNode,
};

export const States: Story = {
  args: { state: 'Invitations Tab' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

// The widths the comments above name, pinned so they do not wait on the
// toolbar: the plus at the heading's end with the pills on its line, ...
export const AddActionAt600: Story = {
  globals: { viewport: { value: 'w600', isRotated: false } },
  render: () => addActionLabelAndPlusNode,
};

// ... the label beneath the heading, where the plus gives way to it, ...
export const AddActionAt382: Story = {
  globals: { viewport: { value: 'w382', isRotated: false } },
  render: () => addActionLabelAndPlusNode,
};

// ... and the loading skeleton's rows as cards.
export const LoadingAt375: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => loadingStateNode,
};

// The last tab open at the width its comment names.
export const PrivilegeChangesAt375: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => privilegeChangesTabNode,
};
