import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LeaveWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/LeaveWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
const meta = {
  title: 'Coven / Leave Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DefaultView = () => (
  <LeaveWorkspaceButton workspaceId="00000000-0000-0000-0000-000000000001" name="Fixture Coven" />
);

export const Default: Story = { render: DefaultView };

// The coven's only owner (M6.16): Leave asks what happens to the coven, a
// hand-over to a member searched by name, or the deletion.
const OnlyOwnerView = () => (
  <LeaveWorkspaceButton
    workspaceId="00000000-0000-0000-0000-000000000001"
    name="Fixture Coven"
    successors={[
      { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
      { userId: '00000000-0000-0000-0000-000000000003', name: 'Fixture C', role: 'viewer' },
    ]}
  />
);

export const OnlyOwner: Story = { render: OnlyOwnerView };

// One other member: offered by name, with nothing to search.
export const OnlyOwnerOneOther: Story = {
  render: () => (
    <LeaveWorkspaceButton
      workspaceId="00000000-0000-0000-0000-000000000001"
      name="Fixture Coven"
      successors={[
        { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
      ]}
    />
  ),
};

// Nobody else in the coven: deletion is the whole answer.
export const OnlyMember: Story = {
  render: () => (
    <LeaveWorkspaceButton
      workspaceId="00000000-0000-0000-0000-000000000001"
      name="Fixture Coven"
      successors={[]}
    />
  ),
};
