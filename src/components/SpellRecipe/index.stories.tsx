import type { Route } from 'next';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SpellRecipe from '.';

// Render-only; what shows and when is asserted in tests/components/SpellRecipe.
const meta = {
  title: 'Grimoire / Spell Recipe',
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Complete: Story = {
  render: () => (
    <SpellRecipe
      title="Hearth Warding Jar"
      intent="To keep the house safe through the winter."
      status="complete"
      visibility="workspace"
      categories={[]}
      lastEdit={{ by: 'Fixture Author', at: '2026-10-01T12:00:00.000Z' }}
      note="Best made on a dry night."
      back={{ href: '/coven/fixture-coven/grimoire' as Route, label: 'Grimoire' }}
      steps={[
        {
          kind: 'ingredient',
          id: 'a',
          name: 'Testwort',
          form: 'Dried Leaf',
          formal: 'Testus wortus',
          quantity: '2',
          unit: 'tsp',
          href: '/coven/fixture-coven/ingredients/a' as Route,
          oneOff: false,
          deleted: false,
          body: null,
        },
        { kind: 'instruction', id: 'b', body: 'Stir three times, sunwise.' },
        {
          kind: 'ingredient',
          id: 'c',
          name: 'Fixture Moss',
          form: 'Fresh',
          formal: null,
          quantity: null,
          unit: null,
          href: null,
          oneOff: true,
          deleted: false,
          body: 'From the garden wall.',
        },
      ]}
    />
  ),
};
