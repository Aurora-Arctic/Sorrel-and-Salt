import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Spinner from '.';

// Render-only; the spinner is hidden from assistive technology, and the
// controls that hold it assert their busy state. It shows after 100ms, so a
// story reload shows it appear.
const meta = {
  title: 'Feedback / Spinner',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Spinner /> Saving Name
    </p>
  ),
};

export const Larger: Story = {
  render: () => (
    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem' }}>
      <Spinner /> Loading
    </p>
  ),
};
