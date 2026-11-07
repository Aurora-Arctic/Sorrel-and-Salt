import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import CategoryPicker from '.';
import type { CategoryPickerProps, PickerCategory } from './types';

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

const defaultNode = <Stateful />;

const somePickedNode = (
  <Stateful initial={[idOf('Testward 1'), idOf('Testcraft 2'), idOf('Fixture Mending 2')]} />
);

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

const withActionAndNoHintNode = (
  <Stateful
    hint={undefined}
    boxName="categories"
    action={(announce) => (
      <button
        type="button"
        className="btn btn--quiet btn--small"
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
  render: ({ state }) => <div>{state}</div>,
};
