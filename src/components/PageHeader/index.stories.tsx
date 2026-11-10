import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import { AdminFrame as InAdminLayout } from '../../../.storybook/admin-frame';
import { ShellFrame } from '../../../.storybook/shell-frame';
import AddAction from '../../app/(shell)/curator/add-action';
import PageHeader from '.';

const meta = {
  title: 'Layout / Page Header',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const AddIngredient = () => (
  <AddAction
    href={'/curator/compendium?new=ingredient-compendium' as Route}
    heading={{ title: 'Add Ingredient' }}
  >
    Add Ingredient
  </AddAction>
);

const defaultNode = (
  <InAdminLayout open="/curator/compendium">
    <main>
      <PageHeader title="Compendium" action={<AddIngredient />} />
    </main>
  </InAdminLayout>
);

const headingAloneNode = (
  <InAdminLayout open="/curator/compendium">
    <main>
      <PageHeader title="Compendium" />
    </main>
  </InAdminLayout>
);

const Long = () => (
  <InAdminLayout open="/curator/deity-traditions">
    <PageHeader
      title="Deity Traditions"
      action={
        <AddAction
          href={'/curator/deity-traditions?new' as Route}
          heading={{ title: 'Add Tradition' }}
        >
          Add Tradition
        </AddAction>
      }
    />
  </InAdminLayout>
);

const longHeadingWithActionNode = <Long />;

const withLeadNode = (
  <InAdminLayout open="/curator/compendium">
    <main>
      <PageHeader
        title="Testwort"
        lead={<span>In Your Cupboard</span>}
        action={<AddIngredient />}
      />
    </main>
  </InAdminLayout>
);

const eyebrowAndLedeNode = (
  <ShellFrame area="none" open="/compendium" signedOut>
    <main className="page-column">
      <PageHeader
        eyebrow="Reference"
        title="Compendium"
        lede="Ingredients for spellwork: their formal and folk names, categories, deities and forms, with the sources behind them."
      />
    </main>
  </ShellFrame>
);

const AtPhoneWidth = () => <Long />;

// A head whose title is not known yet, as a skeleton draws it: a bar in the h1.
const pendingTitleNode = (
  <InAdminLayout open="/curator/compendium">
    <main>
      <PageHeader pendingTitle />
    </main>
  </InAdminLayout>
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Pending Title': pendingTitleNode,
  'Heading Alone': headingAloneNode,
  'Long Heading With Action': longHeadingWithActionNode,
  'With Lead': withLeadNode,
  'Eyebrow And Lede': eyebrowAndLedeNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};

export const Narrow: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => <AtPhoneWidth />,
};
