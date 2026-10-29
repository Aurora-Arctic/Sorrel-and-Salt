import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ComboboxChoice } from '../Combobox/types';
import FormIcon from '../FormIcon';
import FacetCombobox from '.';

// Render-only; behaviour is asserted in tests/components/FacetCombobox. Invented
// values and counts, as a filter reads them from a search (M12.4).
const meta = {
  title: 'Ingredients / Facet Combobox',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ELEMENTS: ComboboxChoice[] = [
  { value: 'air', label: 'Testair', count: 3 },
  { value: 'earth', label: 'Testearth', count: 0 },
  { value: 'fire', label: 'Testfire', count: 9 },
  { value: 'spirit', label: 'Testspirit', count: 1 },
  { value: 'water', label: 'Testwater', count: 7 },
];

// A form group's icon beside each value, as the Forms filter draws it.
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
  ...props
}: {
  initial?: string[];
  choices?: ComboboxChoice[];
  label?: string;
  loading?: boolean;
  typeahead?: boolean;
  hideZeros?: boolean;
  hint?: string;
  emptyPlaceholder?: string;
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
        placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}`}
        removeNoun={label.replace(/s$/, '')}
        {...props}
      />
    </div>
  );
}

// Open the list: Testearth, with a count of nothing, is left out.
const defaultNode = <Stateful />;

// Two chosen: their chips with counts, and the list open on the rest, the zero value still out.
const someChosenNode = <Stateful initial={['fire', 'water']} />;

// Every chip holds a placeholder where its count will be, shimmering unless
// the person asks for reduced motion.
const countsLoadingNode = <Stateful initial={['fire', 'water']} loading />;

// A chosen value with a count of nothing keeps its chip and its cross.
const chosenWithNothingBehindItNode = <Stateful initial={['earth']} />;

// Every value counts nothing: the field stays, its list empty, as a facet the search leaves nothing in.
const allZeroNode = (
  <Stateful
    label="Celestial Bodies"
    choices={[
      { value: 'sun', label: 'Test Sun', count: 0 },
      { value: 'moon', label: 'Test Moon', count: 0 },
    ]}
  />
);

// hideZeros off: Testearth is listed with its count of nothing, and can be chosen.
const zerosListedNode = <Stateful hideZeros={false} />;

const withFormIconsNode = <Stateful label="Forms" choices={FORMS} initial={['leaf', 'oil']} />;

// A line under the label.
const withHintNode = <Stateful hint="Counts follow the other filters." initial={['fire']} />;

// Every count is nothing and none is chosen: the placeholder says so in its own words.
const customEmptyNode = (
  <Stateful
    label="Celestial Bodies"
    choices={[{ value: 'sun', label: 'Test Sun', count: 0 }]}
    emptyPlaceholder="None In These Results"
  />
);

// Narrow, as on a phone: the chips wrap inside the control.
export const Narrow: Story = {
  render: () => (
    <div style={{ maxWidth: '16rem' }}>
      <Stateful initial={['air', 'fire', 'spirit', 'water']} />
    </div>
  ),
};

// Typing narrows the list, as the Forms filter does: the typed box, the chosen
// values still outlined chips with their counts and icons.
export const Typeahead: Story = {
  render: () => <Stateful label="Forms" choices={FORMS} initial={['leaf']} typeahead />,
};

const DEITIES: ComboboxChoice[] = [
  { value: 'a', label: 'Test Aletheia', count: 4, group: 'Test Tradition One' },
  { value: 'b', label: 'Test Borros', count: 0, group: 'Test Tradition One' },
  { value: 'c', label: 'Test Corvane', count: 8, group: 'Test Tradition Two' },
  { value: 'd', label: 'Test Dessa', count: 2, group: 'Test Tradition Two' },
  { value: 'e', label: 'Test Elowen', count: 5, group: 'Test Tradition Two' },
];

// Each choice under its group's heading, as the Deities filter groups by tradition.
const groupedNode = <Stateful label="Deities" choices={DEITIES} initial={['c']} typeahead />;

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
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
