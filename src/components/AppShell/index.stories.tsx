import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { FIXTURE_WORKSPACES, ShellFrame } from '../../../.storybook/shell-frame';

// Render-only; behaviour is asserted in tests/components/AppShell. Each story
// draws the shell as a layout does (.storybook/shell-frame.tsx) around a stub
// page. The workshop's router goes nowhere, so a press only closes a list.
const meta = {
  title: 'Shell / App Shell',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// A coven's index page: the coven's name for its heading, in the coven layout's
// column (src/app/(shell)/coven/[slug]/page.tsx).
const CovenStub = (): ReactElement => (
  <main>
    <h1>Fixture Coven</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

// The admin index page, in the admin layout's column (src/app/(shell)/admin/page.tsx).
const AdminStub = (): ReactElement => (
  <main>
    <h1>Admin</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

// The account pages sit in the narrow page frame, which spaces them from the
// shell's bar (src/app/(shell)/account/page.tsx and its email page).
const AccountStub = ({ heading }: { heading: string }): ReactElement => (
  <main className="page-frame page-frame--narrow">
    <h1>{heading}</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

// The create page's frame, as src/app/(shell)/coven/new/page.tsx draws it.
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

// Opens the Add Ingredient menu once drawn, as a press would.
const MenuOpened = ({ children }: { children: ReactNode }): ReactElement => {
  usePressOnMount('Choose Where to Add');
  return <>{children}</>;
};

const ONE_COVEN = [FIXTURE_WORKSPACES[0]];
const CURATOR = { name: 'Fixture Curator', canCurate: true };

// One control chooses the whole shell around a stub page. Add Menu Open: the coven
// where the viewer may not write is disabled. Create Page: the switcher alone.
// Account Page: no context row. Unverified: brand, account menu and theme disc only.
const STATES: Record<string, ReactNode> = {
  Member: (
    <ShellFrame>
      <CovenStub />
    </ShellFrame>
  ),
  'Admin Page': (
    <ShellFrame area="admin" viewer={{ name: 'Fixture Admin', canCurate: true }} open="/admin">
      <AdminStub />
    </ShellFrame>
  ),
  'Curator Page': (
    <ShellFrame area="admin" role="curator" viewer={CURATOR} open="/admin">
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
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
