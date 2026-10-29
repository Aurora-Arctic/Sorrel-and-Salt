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

// Render-only; behaviour is asserted in tests/components/TabbedPage. The People page
// as `/admin/invitations` draws it: the admin frame and nav, the heading with its
// three tabs, Invitations open, and its New Invitation. The workshop's stub names
// the open address (.storybook/navigation.ts); a tab switch provided above the
// page says a tab is on its way.
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

// Users pressed and on its way: New Invitation and every tab greyed and closed to
// another press, the Users pill in its pending look while Invitations is still the
// current page, and the list's skeleton shimmering below. At 375px the rows are
// cards. Under reduced motion the shapes stand still.
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

// The last tab open, Privilege Changes, at 375px: the three pills fit under the
// heading, and a row too wide would scroll inside its track to centre the open
// tab. Privilege Changes has no action.
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

// The Add as a list page draws it (`AddAction`: a labelled button, and a plus for the
// narrow header), where Default has the plain New Invitation link. At 600px wide the
// plus sits at the heading's end; at 382px the label drops beneath the heading.
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
