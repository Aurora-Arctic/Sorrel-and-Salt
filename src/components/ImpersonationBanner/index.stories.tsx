import type { Story } from '@ladle/react';
import ImpersonationBanner from '.';

// Render-only; behaviour is asserted in tests/components/ImpersonationBanner.
// In the workshop Stop reaches no server, so a click shows the failure.
export default {
  title: 'Impersonation Banner',
};

export const Default: Story = () => (
  <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />
);
