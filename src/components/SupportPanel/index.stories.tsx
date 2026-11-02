import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportPanel from '.';

// Render-only; behaviour is asserted in tests/components/SupportPanel.
const meta = { title: 'Support / Support Panel', component: SupportPanel } satisfies Meta<
  typeof SupportPanel
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SignedOut: Story = { args: { state: { kind: 'signed-out' }, path: '/support' } };
export const TimedOut: Story = {
  args: { state: { kind: 'timed-out', until: new Date('2030-01-02T03:04:00Z') }, path: '/support' },
};
export const Form: Story = { args: { state: { kind: 'form' }, path: '/support' } };
