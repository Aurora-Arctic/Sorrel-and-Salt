import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SpellPreview from '.';
import type { RecipeStep } from '../SpellRecipe/types';

// Render-only; what shows and when is asserted in tests/components/SpellPreview.
const meta = {
  title: 'Grimoire / Spell Preview',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const STEPS: RecipeStep[] = [
  {
    kind: 'ingredient',
    id: 'a',
    name: 'Testwort',
    form: 'dried leaf',
    formal: null,
    variantId: 'v1',
    quantity: '2',
    unit: 'tsp',
    look: null,
    safety: null,
    oneOff: false,
    deleted: false,
    body: null,
  },
  { kind: 'instruction', id: 'b', body: 'Stir three times, sunwise.' },
];

export const Closed: Story = {
  render: () => (
    <SpellPreview
      title="Hearth Warding Jar"
      intent="Keeps the hearth warm."
      categories={[]}
      note="Best on a cold night."
      steps={STEPS}
      jarDescription="Squat Amber Jar"
      sealWaxColor="Red"
      moonPhase="Waxing Gibbous"
      dayOfWeek="Friday"
    />
  ),
};
