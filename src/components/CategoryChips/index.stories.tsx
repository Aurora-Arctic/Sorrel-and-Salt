import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CategoryChips from '.';
import type { CardCategory } from './types';

// Render-only; what shows and when is asserted in tests/components/CategoryChips.
const meta = {
  title: 'Ingredients / Category Chips',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const GROUPS = [
  { colorDark: '#7aa7d9', colorLight: '#1f4f8a' },
  { colorDark: '#c9a3e0', colorLight: '#6b2f8a' },
  { colorDark: '#e0b36b', colorLight: '#8a5a12' },
];
const NAMES = ['Protection', 'Clarity', 'Cleansing', 'Prosperity', 'Dreams', 'Love'];
const make = (count: number): CardCategory[] =>
  NAMES.slice(0, count).map((name, i) => ({
    category: { id: `c${i}`, name },
    group: GROUPS[i % GROUPS.length],
  }));

export const Default: Story = {
  render: () => <CategoryChips categories={make(2)} label="Testwort" />,
};

export const WithMore: Story = {
  render: () => <CategoryChips categories={make(6)} label="Testwort" />,
};

// In a bounded, scrolling frame, as the admin table holds it: the panel is not clipped.
export const InAScrollingFrame: Story = {
  render: () => (
    <div style={{ overflowX: 'auto', inlineSize: '18rem', padding: '1rem', border: '1px solid' }}>
      <CategoryChips categories={make(6)} label="Testwort" />
    </div>
  ),
};

// Both sizes side by side: the regular one the card wears, the compact one the table does.
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <CategoryChips categories={make(3)} label="Testwort" />
      <CategoryChips categories={make(3)} label="Testwort" compact />
    </div>
  ),
};
