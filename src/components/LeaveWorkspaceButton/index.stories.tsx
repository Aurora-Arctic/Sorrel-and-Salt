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

// The coven's only owner (M6.16): Leave asks what happens to the coven, a
// hand-over to a member searched by name, or the deletion.
export const OnlyOwner: Story = () => (
  <LeaveWorkspaceButton
    workspaceId="00000000-0000-0000-0000-000000000001"
    name="Fixture Coven"
    successors={[
      { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
      { userId: '00000000-0000-0000-0000-000000000003', name: 'Fixture C', role: 'viewer' },
    ]}
  />
);

// One other member: offered by name, with nothing to search.
export const OnlyOwnerOneOther: Story = () => (
  <LeaveWorkspaceButton
    workspaceId="00000000-0000-0000-0000-000000000001"
    name="Fixture Coven"
    successors={[
      { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
    ]}
  />
);

// Nobody else in the coven: deletion is the whole answer.
export const OnlyMember: Story = () => (
  <LeaveWorkspaceButton
    workspaceId="00000000-0000-0000-0000-000000000001"
    name="Fixture Coven"
    successors={[]}
  />
);
