import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import CategoryPicker from '.';
import type { CategoryPickerProps, PickerCategory } from './types';

// Render-only; behaviour is asserted in tests/components/CategoryPicker. Four
// of the seed's groups with their colour pairs, copied from
// src/db/seed/category-groups.ts, which a component may not import (CLAUDE.md
// rule 1); the categories under them are invented, two or three to a group.
const meta = {
  title: 'Ingredients / Category Picker',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const INVENTED = ['Testward', 'Fixture Mending', 'Testcraft'];

const GROUPS = [
  { name: 'Protection & Defense', colorDark: '#5d8ab1', colorLight: '#286ba6' },
  { name: 'Love & Connection', colorDark: '#cf6e87', colorLight: '#a44c63' },
  { name: 'Mind & Spirit', colorDark: '#8e7bd1', colorLight: '#6e4ce6' },
  { name: 'Craft & Change', colorDark: '#c371c6', colorLight: '#a13ba5' },
];

const CATEGORIES: PickerCategory[] = GROUPS.flatMap((seed, index) => {
  const group = { id: `group-${index}`, ...seed };
  return INVENTED.slice(0, 2 + (index % 2)).map((name) => ({
    id: `${group.id}-${name}`,
    name: `${name} ${index + 1}`,
    description: 'An invented category, for the workshop.',
    group,
  }));
});

const idOf = (name: string) => CATEGORIES.find((category) => category.name === name)!.id;

/** Holds the picks, so entries come and go. */
function Stateful({
  initial = [],
  ...props
}: Partial<CategoryPickerProps> & { initial?: string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxWidth: '32rem' }}>
      <CategoryPicker
        legend="Categories"
        hint="What this ingredient is used for. Pick as many as apply."
        entry="Category"
        placeholder="Add a category"
        categories={CATEGORIES}
        value={value}
        onChange={setValue}
        {...props}
      />
    </div>
  );
}

// Focus the box to list every category under its group, or type to narrow
// them; a pick is a chip in its group's colour.
const defaultNode = <Stateful />;

const somePickedNode = (
  <Stateful initial={[idOf('Testward 1'), idOf('Testcraft 2'), idOf('Fixture Mending 2')]} />
);

// The entry the error names is edged, and its x reads the error.
const anInvalidEntryNode = (
  <Stateful
    initial={[idOf('Testward 1'), idOf('Testcraft 4')]}
    invalid={[idOf('Testcraft 4')]}
    errorId="story-error"
    error={
      <p id="story-error" className="field__error">
        Testcraft 4: No such category
      </p>
    }
  />
);

const loadingNode = <Stateful categories={[]} pending />;

const failedNode = <Stateful categories={[]} status="The categories could not be loaded." />;

// The filter's reading (M12.4): each row and chip carries how many entries it
// would leave, a zero row is left out, and a chip whose count is
// still on its way holds a placeholder.
const counted = CATEGORIES.map((category, index) => ({
  ...category,
  count: index % 3 === 0 ? 0 : index * 2,
}));

const withCountsNode = (
  <Stateful categories={counted} initial={[counted[1].id]} removeNoun="Category" hideZeros />
);

const countsLoadingNode = (
  <Stateful categories={counted} initial={[counted[1].id]} removeNoun="Category" loading />
);

// A legend action (Copy From Ingredient) sits at the legend's right; no hint draws no tip.
const withActionAndNoHintNode = (
  <Stateful
    hint={undefined}
    boxName="categories"
    action={(announce) => (
      <button
        type="button"
        className="btn btn--small btn--quiet"
        onClick={() => announce('Copied.')}
      >
        Copy From Ingredient
      </button>
    )}
  />
);

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Some Picked': somePickedNode,
  'An Invalid Entry': anInvalidEntryNode,
  Loading: loadingNode,
  Failed: failedNode,
  'With Counts': withCountsNode,
  'Counts Loading': countsLoadingNode,
  'Action And No Hint': withActionAndNoHintNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
