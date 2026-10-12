import type { Story } from '@ladle/react';
import InviteDialog from '.';

// Render-only; behaviour is asserted in tests/components/InviteDialog. In the
// workshop the call reaches no server, so sending shows the failure.
export default {
  title: 'Coven / Invite Dialog',
};

export const Default: Story = () => (
  <InviteDialog workspaceId="00000000-0000-0000-0000-000000000001" />
);
