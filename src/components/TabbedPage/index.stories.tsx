import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import AddAction from '@/app/(shell)/_admin/add-action';
import { AdminFrame, AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { INVITATIONS } from '../../../.storybook/fixtures';
import AdminInvitations, { InviteAdmin } from '../AdminInvitations';
import { ADMIN_PAGES } from '../AdminNav/sections';
import PrivilegeLedger from '../PrivilegeLedger';
import TabbedPage from '.';
import { TabSwitchContext } from './tab-switch';
import type { TabSwitch } from './types';

const meta = {
  title: 'Layout / Tabbed Page',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ON_ITS_WAY = { pending: true, target: ADMIN_PAGES.people.tabs[0], go: () => undefined };

const People = ({
  open = '/keepers/invitations',
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

const Loading = ({ tab = ON_ITS_WAY }: { tab?: TabSwitch }) => (
  <TabSwitchContext.Provider value={tab}>
    <Invitations />
  </TabSwitchContext.Provider>
);

const invitationsNode = <Invitations />;
const loadingStateNode = <Loading />;

const loadingUnfilteredNode = (
  <Loading tab={{ ...ON_ITS_WAY, target: ADMIN_PAGES.people.tabs[1] }} />
);

const privilegeChangesTabNode = (
  <People open="/keepers/privilege-changes" action={null}>
    <PrivilegeLedger
      filter={{}}
      changes={[
        {
          id: 'c1',
          at: new Date('2026-10-01T09:30:00Z'),
          subject: { name: 'Ada Fixturewort', href: '/keepers/users?q=ada' },
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

const addActionLabelAndPlusNode = (
  <People
    action={
      <AddAction href="/keepers/invitations?invite" heading={{ title: 'New Invitation' }}>
        New Invitation
      </AddAction>
    }
  >
    <AdminInvitations invitations={INVITATIONS} />
  </People>
);

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
  render: ({ state }) => <div>{state}</div>,
};

export const AddActionAt600: Story = {
  globals: { viewport: { value: 'w600', isRotated: false } },
  render: () => addActionLabelAndPlusNode,
};

export const AddActionAt382: Story = {
  globals: { viewport: { value: 'w382', isRotated: false } },
  render: () => addActionLabelAndPlusNode,
};

export const LoadingAt375: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => loadingStateNode,
};

export const PrivilegeChangesAt375: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => privilegeChangesTabNode,
};
