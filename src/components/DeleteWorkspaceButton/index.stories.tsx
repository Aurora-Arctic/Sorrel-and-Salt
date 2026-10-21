import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DeleteWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/DeleteWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
const meta = {
  title: 'Coven / Delete Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DefaultView = () => (
  <DeleteWorkspaceButton workspaceId="00000000-0000-0000-0000-000000000001" name="Fixture Coven" />
);

export const Default: Story = { render: DefaultView };
