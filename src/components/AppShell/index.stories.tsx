import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { FIXTURE_WORKSPACES, ShellFrame } from '../../../.storybook/shell-frame';

const meta = {
  title: 'Shell / App Shell',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const CovenStub = (): ReactElement => (
  <main>
    <h1>Fixture Coven</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

const AdminStub = (): ReactElement => (
  <main>
    <h1>Admin</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

const AccountStub = ({ heading }: { heading: string }): ReactElement => (
  <main className="page-frame page-frame--narrow">
    <h1>{heading}</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

const CreateStub = (): ReactElement => (
  <main className="page-frame page-frame--narrow">
    <div className="page-frame__section panel">
      <div className="header">
        <h1>Create Coven</h1>
        <p className="lede">The page itself, beneath the shell.</p>
      </div>
    </div>
  </main>
);

const MenuOpened = ({ children }: { children: ReactNode }): ReactElement => {
  usePressOnMount('Choose Where to Add');
  return <>{children}</>;
};

const ONE_COVEN = [FIXTURE_WORKSPACES[0]];
const CURATOR = { name: 'Fixture Curator', canCurate: true };

const STATES: Record<string, ReactNode> = {
  Member: (
    <ShellFrame>
      <CovenStub />
    </ShellFrame>
  ),
  'Admin Page': (
    <ShellFrame area="admin" viewer={{ name: 'Fixture Admin', canCurate: true }} open="/keepers">
      <AdminStub />
    </ShellFrame>
  ),
  'Curator Page': (
    <ShellFrame area="admin" role="curator" viewer={CURATOR} open="/keepers">
      <AdminStub />
    </ShellFrame>
  ),
  'Add Menu Open': (
    <MenuOpened>
      <ShellFrame viewer={CURATOR}>
        <CovenStub />
      </ShellFrame>
    </MenuOpened>
  ),
  'Curator In One Coven': (
    <ShellFrame viewer={CURATOR} workspaces={ONE_COVEN}>
      <CovenStub />
    </ShellFrame>
  ),
  'Create Page': (
    <ShellFrame area="new">
      <CreateStub />
    </ShellFrame>
  ),
  'Account Page': (
    <ShellFrame area="none" open="/account">
      <AccountStub heading="Your Account" />
    </ShellFrame>
  ),
  'Invitations Waiting': (
    <ShellFrame area="none" viewer={{ pendingInvitations: 2 }} open="/account">
      <AccountStub heading="Your Account" />
    </ShellFrame>
  ),
  Unverified: (
    <ShellFrame area="none" viewer={{ verified: false }} open="/account/email">
      <AccountStub heading="Your Email" />
    </ShellFrame>
  ),
};

export const States: Story = {
  args: { state: 'Member' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
