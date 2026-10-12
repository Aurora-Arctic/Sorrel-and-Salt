import type { Story } from '@ladle/react';
import { ShellFrame } from '../../../.ladle/shell-frame';

// Render-only; behaviour is asserted in tests/components/AppShell. Each story
// draws the shell as a layout does (.ladle/shell-frame.tsx), around a stub
// page. The workshop's router goes nowhere, so a press only closes a list.
export default {
  title: 'AppShell',
};

const Page = () => (
  <main>
    <h1>Grimoire</h1>
    <p>The page itself, beneath the shell.</p>
  </main>
);

// A member on a coven page: the switcher names the coven, three to choose
// from and Create Coven last.
export const CovenPage: Story = () => (
  <ShellFrame>
    <Page />
  </ShellFrame>
);

// An admin on an admin page: Your Coven and Admin in the bar, "Admin" in the row.
export const AdminPage: Story = () => (
  <ShellFrame area="admin" viewer={{ name: 'Fixture Admin', isAdmin: true }}>
    <Page />
  </ShellFrame>
);

// A page that belongs to no area: the account page, with no context row.
export const AccountPage: Story = () => (
  <ShellFrame area="none" open="/account">
    <Page />
  </ShellFrame>
);

// An unverified account: the brand as text, the account menu and the theme
// disc, and nothing else.
export const Unverified: Story = () => (
  <ShellFrame area="none" viewer={{ verified: false }} open="/account/email">
    <Page />
  </ShellFrame>
);

// A phone's width: the brand reads "S&S", the name leaves the account button,
// the switcher fills its own row, and the section nav is a bar along the bottom.
export const Phone: Story = () => (
  <ShellFrame>
    <Page />
  </ShellFrame>
);
Phone.meta = { width: 375 };

export const PhoneAdmin: Story = () => (
  <ShellFrame area="admin" viewer={{ name: 'Fixture Admin', isAdmin: true }}>
    <Page />
  </ShellFrame>
);
PhoneAdmin.meta = { width: 375 };
