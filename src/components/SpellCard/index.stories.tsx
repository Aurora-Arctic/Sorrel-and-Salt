import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import SpellCard, { SpellCardFilters } from '.';
import './index.stories.scss';

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

const LAST_EDIT = { by: 'Testa Fixture', at: '2026-10-20T10:00:00Z' };

const BASE = {
  id: 'story',
  title: 'Hearth Warding Jar',
  intent: 'To keep the house and everyone under its roof safe through the winter.',
  status: 'complete' as const,
  visibility: 'workspace' as const,
  categories: CATEGORIES,
};

// Every state of the card in one grid. The cell is the grimoire's narrowest column.
// The burn filter of the smouldering edge rides along, so hovering any card shows it.
export const States: Story = {
  render: () => (
    <>
      <SpellCardFilters />
      <StatesGrid
        cell="22rem"
        states={{
          Complete: <SpellCard {...BASE} id="complete" />,
          Draft: <SpellCard {...BASE} id="draft" status="draft" title="Dreaming Sachet" />,
          Private: <SpellCard {...BASE} id="private" visibility="private" />,
          'Private Draft': (
            <SpellCard
              {...BASE}
              id="private-draft"
              status="draft"
              visibility="private"
              title="Dreaming Sachet"
            />
          ),
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
    </>
  ),
};

// The hover, the parchment smouldering from the foot corner: one card held in its
// finished hovered state, and one at rest to hover with the pointer.
export const Hover: Story = {
  render: () => (
    <>
      <SpellCardFilters />
      <StatesGrid
        cell="22rem"
        states={{
          Held: (
            <div className="spell-card-story-held">
              <SpellCard {...BASE} id="held" lastEdit={LAST_EDIT} />
            </div>
          ),
          'Hover It': <SpellCard {...BASE} id="hover" lastEdit={LAST_EDIT} />,
        }}
      />
    </>
  ),
};
