import type { Story } from '@ladle/react';
import DeleteWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/DeleteWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
export default {
  title: 'Coven / Delete Coven Button',
};

export const Default: Story = () => (
  <DeleteWorkspaceButton workspaceId="00000000-0000-0000-0000-000000000001" name="Fixture Coven" />
);

export const PhoneDark: Story = () => <Default />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Default />;
PhoneLight.meta = { theme: 'light', width: 375 };
