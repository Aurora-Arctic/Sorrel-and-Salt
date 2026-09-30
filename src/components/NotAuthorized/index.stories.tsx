import type { Story } from '@ladle/react';
import NotAuthorized from '.';

// Render-only; behaviour is asserted in tests/components/NotAuthorized. It
// takes no props: every signed-in non-admin sees the same page.
export default {
  title: 'Not Authorized',
};

export const Default: Story = () => (
  <main className="not-authorized-page">
    <NotAuthorized />
  </main>
);
