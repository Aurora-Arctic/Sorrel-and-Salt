import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import { useEffect, useRef } from 'react';
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

// Opens the +N panel as a person would, by pressing the button in its own frame.
const PanelOpen = () => {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => frame.current?.querySelector('button')?.click(), []);
  return (
    <div ref={frame} style={{ minBlockSize: '12rem' }}>
      <CategoryChips categories={make(6)} label="Testwort" />
    </div>
  );
};

// The limit is two chips: past that the rest sit behind a +N button.
export const States: Story = {
  render: () => (
    <StatesGrid
      states={{
        'No Categories': <CategoryChips categories={make(0)} label="Testwort" />,
        'Exactly At The Limit': <CategoryChips categories={make(2)} label="Testwort" />,
        'One In The More Button': <CategoryChips categories={make(3)} label="Testwort" />,
        'Several In The More Button': <CategoryChips categories={make(6)} label="Testwort" />,
        'More Panel Open': <PanelOpen />,
        // In a bounded, scrolling frame, as the admin table holds it: the panel is not clipped.
        'In A Scrolling Frame': (
          <div
            style={{ overflowX: 'auto', inlineSize: '18rem', padding: '1rem', border: '1px solid' }}
          >
            <CategoryChips categories={make(6)} label="Testwort" />
          </div>
        ),
        // The entry's own chip, then two only its forms carry: dashed, each with a tip naming the forms.
        'On A Form Only': (
          <CategoryChips
            categories={[
              ...make(1),
              { ...make(2)[1], forms: ['Oil', 'Dried Leaf'] },
              { ...make(3)[2], forms: ['Oil'] },
            ]}
            label="Testwort"
            showAll
          />
        ),
        // Both sizes: the regular one the card wears, the compact one the table does.
        Sizes: (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <CategoryChips categories={make(3)} label="Testwort" />
            <CategoryChips categories={make(3)} label="Testwort" compact />
          </div>
        ),
      }}
    />
  ),
};
