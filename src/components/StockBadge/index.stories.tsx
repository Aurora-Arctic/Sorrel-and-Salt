import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StockBadge } from '.';

// Render-only; which state shows when is asserted in tests/components/StockBadge.
// The Low badge's tip opens on hover, tap or focus: point at it to see it.
const meta = {
  title: 'Ingredients / Stock Badge',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ paddingBlockStart: '3rem' }}>
      <StockBadge quantity={6} threshold={10} unit="g" />
    </div>
  ),
};

export const Out: Story = { render: () => <StockBadge quantity={0} threshold={10} unit="g" /> };
