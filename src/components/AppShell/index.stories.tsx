import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { FIXTURE_WORKSPACES, ShellFrame } from '../../../.storybook/shell-frame';

// Render-only; behaviour is asserted in tests/components/AppShell. Each story
// draws the shell as a layout does (.storybook/shell-frame.tsx), around a stub
// page that wraps and names itself as the real page of that area does. The
// workshop's router goes nowhere, so a press only closes a list.
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

// Each state is the whole shell around a stub page, so one control chooses it.
// Member: the switcher names the coven, three to choose from and Create Coven
// last. Admin Page: Your Covens and Admin in the bar, "Admin" in the row, and
// Add Ingredient as a split button (the compendium and each coven). Curator
// Page: the same without People in the row's nav. Add Menu Open: the menu's
// two groups, with the third coven, where the viewer may not write, disabled.
// Your Coven, singular, is the label for a curator in one coven. Create Page:
// the switcher alone, since the page belongs to no one coven. Account Page: no
// context row. Invitations Waiting: the account menu's count. Unverified: the
// brand as text, the account menu and the theme disc, and nothing else.
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
