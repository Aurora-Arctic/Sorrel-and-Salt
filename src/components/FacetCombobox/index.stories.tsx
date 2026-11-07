import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ComboboxChoice } from '../Combobox/types';
import FormIcon from '../FormIcon';
import FacetCombobox from '.';

const meta = {
  title: 'Forms / Facet Combobox',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const ELEMENTS: ComboboxChoice[] = [
  { value: 'air', label: 'Testair', count: 3 },
  { value: 'earth', label: 'Testearth', count: 0 },
  { value: 'fire', label: 'Testfire', count: 9 },
  { value: 'spirit', label: 'Testspirit', count: 1 },
  { value: 'water', label: 'Testwater', count: 7 },
];

const FORMS: ComboboxChoice[] = [
  { value: 'leaf', label: 'Test Leaf', count: 12, icon: <FormIcon name="botanical" /> },
  { value: 'bone', label: 'Test Bone', count: 0, icon: <FormIcon name="animal" /> },
  { value: 'salt', label: 'Test Salt', count: 5, icon: <FormIcon name="mineral" /> },
  { value: 'oil', label: 'Test Oil', count: 4, icon: <FormIcon name="fluid" /> },
  { value: 'curio', label: 'Test Curio', count: 2, icon: <FormIcon name={null} /> },
];

function Stateful({
  initial = [],
  choices = ELEMENTS,
  label = 'Elements',
  noun = label.replace(/s$/, ''),
  ...props
}: {
  initial?: string[];
  choices?: ComboboxChoice[];
  label?: string;
  noun?: string;
  loading?: boolean;
  typeahead?: boolean;
  hideZeros?: boolean;
  hint?: string;
  emptyPlaceholder?: string;
  counts?: boolean;
}) {
  const [values, setValues] = useState(initial);
  return (
    <div style={{ maxWidth: '24rem' }}>
      <FacetCombobox
        label={label}
        name="facet"
        choices={choices}
        values={values}
        onChange={setValues}
        placeholder={`Add ${noun}`}
        removeNoun={noun}
        {...props}
      />
    </div>
  );
}

const defaultNode = <Stateful />;

const someChosenNode = <Stateful initial={['fire', 'water']} />;

const countsLoadingNode = <Stateful initial={['fire', 'water']} loading />;

const chosenWithNothingBehindItNode = <Stateful initial={['earth']} />;

const allZeroNode = (
  <Stateful
    label="Celestial Bodies"
    noun="Celestial Body"
    choices={[
      { value: 'sun', label: 'Test Sun', count: 0 },
      { value: 'moon', label: 'Test Moon', count: 0 },
    ]}
  />
);

const zerosListedNode = <Stateful hideZeros={false} />;

const withFormIconsNode = <Stateful label="Forms" choices={FORMS} initial={['leaf', 'oil']} />;

const withHintNode = <Stateful hint="Counts follow the other filters." initial={['fire']} />;

const customEmptyNode = (
  <Stateful
    label="Celestial Bodies"
    noun="Celestial Body"
    choices={[{ value: 'sun', label: 'Test Sun', count: 0 }]}
    emptyPlaceholder="None In These Results"
  />
);

const narrowNode = (
  <div style={{ maxWidth: '16rem' }}>
    <Stateful initial={['air', 'fire', 'spirit', 'water']} />
  </div>
);

const typeaheadNode = <Stateful label="Forms" choices={FORMS} initial={['leaf']} typeahead />;

const withoutCountsNode = (
  <Stateful
    label="Covens"
    choices={[
      { value: 'first', label: 'Test Coven One' },
      { value: 'second', label: 'Test Coven Two' },
      { value: 'third', label: 'Test Coven Three' },
    ]}
    initial={['first']}
    counts={false}
  />
);

const DEITIES: ComboboxChoice[] = [
  { value: 'a', label: 'Test Aletheia', count: 4, group: 'Test Tradition One' },
  { value: 'b', label: 'Test Borros', count: 0, group: 'Test Tradition One' },
  { value: 'c', label: 'Test Corvane', count: 8, group: 'Test Tradition Two' },
  { value: 'd', label: 'Test Dessa', count: 2, group: 'Test Tradition Two' },
  { value: 'e', label: 'Test Elowen', count: 5, group: 'Test Tradition Two' },
];

const groupedNode = (
  <Stateful label="Deities" noun="Deity" choices={DEITIES} initial={['c']} typeahead />
);

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Some Chosen': someChosenNode,
  'Counts Loading': countsLoadingNode,
  'Chosen With Nothing Behind It': chosenWithNothingBehindItNode,
  'All Zero': allZeroNode,
  'Zeros Listed': zerosListedNode,
  'With Form Icons': withFormIconsNode,
  Grouped: groupedNode,
  'With Hint': withHintNode,
  'Custom Empty Text': customEmptyNode,
  Narrow: narrowNode,
  Typeahead: typeaheadNode,
  'Without Counts': withoutCountsNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
