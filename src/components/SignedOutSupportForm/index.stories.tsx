import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SignedOutSupportForm from '.';

// Render-only; behaviour is asserted in tests/components/SignedOutSupportForm.
const meta = {
  title: 'Support / Signed-Out Support Form',
  component: SignedOutSupportForm,
} satisfies Meta<typeof SignedOutSupportForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { path: '/support' } };
