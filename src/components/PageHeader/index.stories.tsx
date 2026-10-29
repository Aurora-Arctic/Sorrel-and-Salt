import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import { AdminFrame as InAdminLayout } from '../../../.storybook/admin-frame';
import AddAction from '../../app/(shell)/admin/add-action';
import PageHeader from '.';

// Render-only: a heading and its action are the whole component, so this is for the
// look at desktop and phone width (toolbar viewport menu), where the action is a
// plus with its label as a tip. Each sits in `AdminFrame` (claude-docs/styling.md, "The page column").
const meta = {
  title: 'Layout / Page Header',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// The compendium's, the one admin page with a heading of its own since the
// others went into tabs.
const AddIngredient = () => (
  <AddAction
    href={'/admin/compendium?new=ingredient-compendium' as Route}
    heading={{ title: 'Add Ingredient' }}
  >
    Add Ingredient
  </AddAction>
);

const defaultNode = (
  <InAdminLayout open="/admin/compendium">
    <main>
      <PageHeader title="Compendium" action={<AddIngredient />} />
    </main>
  </InAdminLayout>
);

const headingAloneNode = (
  <InAdminLayout open="/admin/compendium">
    <main>
      <PageHeader title="Compendium" />
    </main>
  </InAdminLayout>
);

// A heading long enough to wrap beside its action when narrow,
// standing in for any.
const Long = () => (
  <InAdminLayout open="/admin/deity-traditions">
    <PageHeader
      title="Deity Traditions"
      action={
        <AddAction
          href={'/admin/deity-traditions?new' as Route}
          heading={{ title: 'Add Tradition' }}
        >
          Add Tradition
        </AddAction>
      }
    />
  </InAdminLayout>
);

const longHeadingWithActionNode = <Long />;

// The entry page's mark before the heading, on its own line.
const withLeadNode = (
  <InAdminLayout open="/admin/compendium">
    <main>
      <PageHeader
        title="Testwort"
        lead={<span>In Your Cupboard</span>}
        action={<AddIngredient />}
      />
    </main>
  </InAdminLayout>
);

// The long heading again at a phone's width, where it wraps beside the action.
const AtPhoneWidth = () => <Long />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Heading Alone': headingAloneNode,
  'Long Heading With Action': longHeadingWithActionNode,
  'With Lead': withLeadNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

// Pinned to a phone's width, since the wrap is what it shows.
export const Narrow: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => <AtPhoneWidth />,
};
