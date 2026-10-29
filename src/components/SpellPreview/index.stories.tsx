import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SpellPreview from '.';
import type { PreviewStep } from './types';

// Render-only; what shows and when is asserted in tests/components/SpellPreview.
const meta = {
  title: 'Grimoire / Spell Preview',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const STEPS: PreviewStep[] = [
  {
    kind: 'ingredient',
    id: 'a',
    name: 'Testwort (Dried Leaf)',
    quantity: '2',
    unit: 'tsp',
    body: null,
  },
  { kind: 'instruction', id: 'b', body: 'Stir three times, sunwise.' },
];

export const Closed: Story = {
  render: () => <SpellPreview title="Hearth Warding Jar" steps={STEPS} />,
};
