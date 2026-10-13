import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { ShellFrame } from '../../../.ladle/shell-frame';

// Render-only; behaviour is asserted in tests/components/AppShell. Each story
// draws the shell as a layout does (.ladle/shell-frame.tsx), around a stub
// page that wraps and names itself as the real page of that area does. The
// workshop's router goes nowhere, so a press only closes a list.
export default {
  title: 'Shell / App Shell',
};

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

// A member on a coven page: the switcher names the coven, three to choose
// from and Create Coven last.
export const CovenPage: Story = () => (
  <ShellFrame>
    <CovenStub />
  </ShellFrame>
);

// An admin on an admin page: Your Coven and Admin in the bar, "Admin" in the row.
export const AdminPage: Story = () => (
  <ShellFrame area="admin" viewer={{ name: 'Fixture Admin', isAdmin: true }} open="/admin">
    <AdminStub />
  </ShellFrame>
);

// The create page: the context row holds the switcher alone, with no section
// nav, since the page belongs to no one coven.
export const CreatePage: Story = () => (
  <ShellFrame area="new">
    <CreateStub />
  </ShellFrame>
);

// A page that belongs to no area: the account page, with no context row.
export const AccountPage: Story = () => (
  <ShellFrame area="none" open="/account">
    <AccountStub heading="Your Account" />
  </ShellFrame>
);

// An unverified account: the brand as text, the account menu and the theme
// disc, and nothing else.
export const Unverified: Story = () => (
  <ShellFrame area="none" viewer={{ verified: false }} open="/account/email">
    <AccountStub heading="Your Email" />
  </ShellFrame>
);

// A phone's width: the brand reads "S&S", the name leaves the account button,
// the switcher fills its own row, and the section nav is a bar along the bottom.
export const Phone: Story = () => (
  <ShellFrame>
    <CovenStub />
  </ShellFrame>
);
Phone.meta = { width: 375 };

export const PhoneAdmin: Story = () => (
  <ShellFrame area="admin" viewer={{ name: 'Fixture Admin', isAdmin: true }} open="/admin">
    <AdminStub />
  </ShellFrame>
);
PhoneAdmin.meta = { width: 375 };

// The create page at a phone's width: the switcher fills the row.
export const PhoneCreatePage: Story = () => (
  <ShellFrame area="new">
    <CreateStub />
  </ShellFrame>
);
PhoneCreatePage.meta = { width: 375 };
