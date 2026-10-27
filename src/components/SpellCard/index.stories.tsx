import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import SpellCard from '.';

// Render-only; what shows and when is asserted in tests/components/SpellCard.
const meta = {
  title: 'Grimoire / Spell Card',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const CATEGORIES = [
  {
    category: { id: 'c1', name: 'Protection' },
    group: { colorDark: '#7aa7d9', colorLight: '#1f4f8a' },
  },
  {
    category: { id: 'c2', name: 'Clarity' },
    group: { colorDark: '#c9a3e0', colorLight: '#6b2f8a' },
  },
];

const BASE = {
  id: 'story',
  title: 'Hearth Warding Jar',
  intent: 'To keep the house and everyone under its roof safe through the winter.',
  status: 'complete' as const,
  categories: CATEGORIES,
};

// Every state of the card in one grid. The cell is the grimoire's narrowest column.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        Complete: <SpellCard {...BASE} id="complete" />,
        Draft: <SpellCard {...BASE} id="draft" status="draft" title="Dreaming Sachet" />,
        Untitled: <SpellCard {...BASE} id="untitled" status="draft" title={null} />,
        'No Intent': <SpellCard {...BASE} id="no-intent" intent={null} />,
        'No Categories': <SpellCard {...BASE} id="no-categories" categories={[]} />,
        'Long Title': (
          <SpellCard
            {...BASE}
            id="long"
            title="A Very Long Spell Title for Banishing the Damp from Grandmother's Cellar"
          />
        ),
      }}
    />
  ),
};
