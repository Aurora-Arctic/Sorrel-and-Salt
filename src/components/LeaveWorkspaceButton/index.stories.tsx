import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import LeaveWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/LeaveWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
const meta = {
  title: 'Coven / Leave Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ID = '00000000-0000-0000-0000-000000000001';

// Leave: a member just leaves. Only Owner (M6.16): Leave asks what happens to the coven, a hand-over
// to a member searched by name, or the deletion. One other member: offered by name, with nothing to
// search. Only Member: nobody else in the coven, so deletion is the whole answer.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="12rem"
      states={{
        Member: <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />,
        'Only Owner': (
          <LeaveWorkspaceButton
            workspaceId={ID}
            name="Fixture Coven"
            successors={[
              { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
              { userId: '00000000-0000-0000-0000-000000000003', name: 'Fixture C', role: 'viewer' },
            ]}
          />
        ),
        'Only Owner One Other': (
          <LeaveWorkspaceButton
            workspaceId={ID}
            name="Fixture Coven"
            successors={[
              { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
            ]}
          />
        ),
        'Only Member': <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={[]} />,
      }}
    />
  ),
};
