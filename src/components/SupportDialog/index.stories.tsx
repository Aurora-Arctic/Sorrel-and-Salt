import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportDialog from '.';

// Render-only; behaviour is asserted in tests/components/SupportDialog. The address carries the
// parameters that open it.
const meta = {
  title: 'Support / Support Dialog',
  component: SupportDialog,
  parameters: {
    nextjs: { navigation: { pathname: '/coven/fixture', query: { support: 'bug', error: '404' } } },
  },
} satisfies Meta<typeof SupportDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { args: { verified: true } };
export const Unverified: Story = { args: { verified: false } };
