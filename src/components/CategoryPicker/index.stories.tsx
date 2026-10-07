import type { Story } from '@ladle/react';
import { useState } from 'react';
import CategoryPicker from '.';
import type { CategoryPickerProps, PickerCategory } from './types';

// Render-only; behaviour is asserted in tests/components/CategoryPicker. Four
// of the seed's groups with their colour pairs, copied from
// src/db/seed/category-groups.ts, which a component may not import (CLAUDE.md
// rule 1); the categories under them are invented, two or three to a group.
export default {
  title: 'Forms / Category Picker',
};

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
export const NothingPicked: Story = () => <Stateful />;

export const SomePicked: Story = () => (
  <Stateful initial={[idOf('Testward 1'), idOf('Testcraft 2'), idOf('Fixture Mending 2')]} />
);

// The entry the error names is edged, and its x reads the error.
export const AnInvalidEntry: Story = () => (
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

export const Loading: Story = () => <Stateful categories={[]} pending />;

export const CouldNotLoad: Story = () => (
  <Stateful categories={[]} status="The categories could not be loaded." />
);
