import type { Story } from '@ladle/react';
import AdminNav from '.';

// Render-only; behaviour is asserted in tests/components/AdminNav. It takes
// no props: every admin sees the same six entries.
export default {
  title: 'AdminNav',
};

export const Default: Story = () => (
  <div className="admin-layout">
    <AdminNav />
  </div>
);
