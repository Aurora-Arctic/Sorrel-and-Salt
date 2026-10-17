import type { Story } from '@ladle/react';
import { useState } from 'react';
import type { ComboboxChoice } from '../Combobox/types';
import FormIcon from '../FormIcon';
import FacetCombobox from '.';

// Render-only; behaviour is asserted in tests/components/FacetCombobox. Invented
// values and counts, as a filter reads them from a search (M12.4).
export default {
  title: 'Admin / Facet Combobox',
};

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
        placeholder="Add an element"
        removeNoun={label.replace(/s$/, '')}
        {...props}
      />
    </div>
  );
}

// Open the list: Testearth, with a count of nothing, is last, disabled and noted.
export const NothingChosen: Story = () => <Stateful />;

export const SomeChosen: Story = () => <Stateful initial={['fire', 'water']} />;

// Every chip holds a placeholder where its count will be, shimmering unless
// the person asks for reduced motion.
export const CountsLoading: Story = () => <Stateful initial={['fire', 'water']} loading />;

// A chosen value with a count of nothing keeps its chip and its cross.
export const ChosenWithNothingBehindIt: Story = () => <Stateful initial={['earth']} />;

export const WithFormIcons: Story = () => (
  <Stateful label="Forms" choices={FORMS} initial={['leaf', 'oil']} />
);

// Narrow, as on a phone: the chips wrap inside the control.
export const Narrow: Story = () => (
  <div style={{ maxWidth: '16rem' }}>
    <Stateful initial={['air', 'fire', 'spirit', 'water']} />
  </div>
);
