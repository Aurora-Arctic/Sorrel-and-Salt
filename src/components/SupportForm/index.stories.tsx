import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportForm from '.';

// Render-only; behaviour is asserted in tests/components/SupportForm.
const meta = { title: 'Support / Support Form', component: SupportForm } satisfies Meta<
  typeof SupportForm
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { path: '/support' } };
export const FromAnErrorPage: Story = {
  args: { path: '/coven/fixture/missing', kind: 'bug', errorCode: 404 },
};
export const InADialog: Story = { args: { path: '/support', onDone: () => undefined } };
