import type { Story } from '@ladle/react';
import LeaveWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/LeaveWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
export default {
  title: 'Coven / Leave Workspace Button',
};

export const Default: Story = () => (
  <LeaveWorkspaceButton workspaceId="00000000-0000-0000-0000-000000000001" name="Fixture Coven" />
);
