import type { Route } from 'next';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Reopenable } from '../../../.storybook/reopenable';
import SpellRecipe from '.';
import SpellRecipeBody from './body';
import SpellLookDialog from './look-dialog';
import type { RecipeStep } from './types';

// Render-only; what shows and when is asserted in tests/components/SpellRecipe.
const meta = {
  title: 'Grimoire / Spell Recipe',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const STEPS: RecipeStep[] = [{ kind: 'instruction', id: 'b', body: 'Stir three times, sunwise.' }];

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
      jarDescription="4 oz jar"
      sealWaxColor="Green"
      moonPhase="Waxing Crescent"
      dayOfWeek="Thursday"
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
          look: {
            href: '/coven/fixture-coven/grimoire/sp?entry=a' as Route,
            name: 'Testwort',
            canonicalName: 'Testus wortus',
            nomenclature: 'botanical',
          },
          safety: { toxic: false, safetyNotes: null, variants: [] },
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
          look: null,
          safety: null,
          oneOff: true,
          deleted: false,
          body: 'From the garden wall.',
        },
      ]}
    />
  ),
};

// Quick Look (M13.21): the recipe's body in a modal over the grimoire list. The workshop's
// router goes nowhere, so Close, Escape and the links leave Open Again (`Reopenable`).
const look = (editHref?: Route) => (
  <Reopenable>
    {() => (
      <SpellLookDialog
        closeHref={'/coven/fixture-coven/grimoire' as Route}
        opened={{
          title: 'Hearth Warding Jar',
          lastEdit: { by: 'Fixture Author', at: '2026-10-01T12:00:00.000Z' },
          recipeHref: '/coven/fixture-coven/grimoire/s1' as Route,
          editHref,
          children: (
            <SpellRecipeBody
              title="Hearth Warding Jar"
              intent="To keep the house safe through the winter."
              categories={[]}
              note="Best made on a dry night."
              jarDescription="4 oz jar"
              sealWaxColor="Green"
              moonPhase="Waxing Crescent"
              dayOfWeek="Thursday"
              steps={STEPS}
            />
          ),
        }}
      />
    )}
  </Reopenable>
);

export const QuickLookForMember: Story = {
  name: 'Quick Look',
  render: () => look('/coven/fixture-coven/grimoire?edit=s1' as Route),
};

export const QuickLookForViewer: Story = {
  name: 'Quick Look, Read Only',
  render: () => look(),
};

export const QuickLookFailed: Story = {
  name: 'Quick Look, Read Failed',
  render: () => (
    <Reopenable>
      {() => <SpellLookDialog closeHref={'/coven/fixture-coven/grimoire' as Route} failed />}
    </Reopenable>
  ),
};
