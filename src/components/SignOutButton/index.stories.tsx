import type { Story } from '@ladle/react';
import SignOutButton from '.';

// Render-only; behaviour is asserted in tests/components/SignOutButton. In the
// workshop the call reaches no auth server, so a click shows the failure.
export default {
  title: 'Account / Sign Out Button',
};

export const Default: Story = () => (
  <div className="page-header">
    <h1>Your Account</h1>
    <SignOutButton />
  </div>
);
