import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import Spinner from '.';

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
