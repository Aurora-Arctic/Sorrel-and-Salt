import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import Spinner from '.';

// Render-only; the spinner is hidden from assistive technology, and the
// controls that hold it assert their busy state. It shows after 100ms, so a
// story reload shows it appear.
const meta = {
  title: 'Feedback / Spinner',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const line = { display: 'flex', alignItems: 'center', gap: '0.5rem' } as const;

export const States: Story = {
  render: () => (
    <StatesGrid
      states={{
        Default: (
          <p style={line}>
            <Spinner /> Saving Name
          </p>
        ),
        Larger: (
          <p style={{ ...line, fontSize: '2rem' }}>
            <Spinner /> Loading
          </p>
        ),
      }}
    />
  ),
};
