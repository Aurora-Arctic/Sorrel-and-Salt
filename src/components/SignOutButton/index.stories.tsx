import type { Story } from '@ladle/react';
import SignOutButton from '.';

// Render-only; behaviour is asserted in tests/components/SignOutButton. In the
// workshop the call reaches no auth server, so a click shows the failure. The
// button alone: the app draws it only at the foot of the account menu
// (`AccountMenu`'s stories show it there), not on a page of its own.
export default {
  title: 'Shell / Sign Out Button',
};

export const Default: Story = () => <SignOutButton />;
