import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ConfirmedAction from '.';

// Render-only; behaviour is asserted in tests/components/ConfirmedAction. The write
// resolves at once, so the workshop shows the idle row and opens the modal on a press.
const meta = {
  title: 'Admin / Confirmed Action',
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Idle: Story = {
  render: () => (
    <ConfirmedAction
      label="Revoke"
      accessibleName="Revoke Invitation for Testwort"
      openClass="btn btn--medium"
      title="Revoke Invitation"
      question={
        <>
          Revoke the invitation for <strong>Testwort</strong>?
        </>
      }
      warning="The link stops working at once."
      busy="Revoking"
      confirmClass="btn btn--destructive"
      send={() => Promise.resolve()}
    />
  ),
};
