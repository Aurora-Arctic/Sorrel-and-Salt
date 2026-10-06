import type { Story } from '@ladle/react';
import { useState } from 'react';
import Combobox, { ComboboxEntry, ComboboxSelect } from '.';
import type { ComboboxOption } from './types';

// Render-only; behaviour is asserted in tests/components/Combobox. The
// suggestions are fixed, so typing filters nothing: the rows are the shape
// each story shows, with what was typed as the last row once there is text.
export default {
  title: 'Forms / Combobox',
};

const FORMS: ComboboxOption[] = [
  {
    value: 'Wax',
    label: 'Wax (Animal)',
    note: 'Used by Testwort (Fixtura testalis)',
    curated: true,
  },
  { value: 'Wax', label: 'Wax (Substance)', note: 'Candle and poppet wax.', curated: true },
  { value: 'Ointment', label: 'Ointment (Preparation)', note: 'A salve or balm.', curated: true },
  { value: 'wax shavings', note: 'Used by Mockleaf', curated: false },
];

const NAMES: ComboboxOption[] = [
  { value: 'Hedge Fixture', note: 'Used by Testwort (Fixtura testalis)' },
  { value: 'Fixture Bane', note: 'Used by Mockleaf, Fixturewort' },
];

/** A field whose suggestions come in two buckets: the vocabulary, then values in use outside it. */
export const TwoBuckets: Story = () => {
  const [value, setValue] = useState('');
  return (
    <>
      <label id="form-label" htmlFor="form">
        Form
      </label>
      <Combobox
        id="form"
        label="Form"
        labelId="form-label"
        value={value}
        onChange={setValue}
        onPick={setValue}
        suggestions={{ options: FORMS, pending: false }}
      />
    </>
  );
};

/** A list's box: its entries inside the control with an x each, one cut off with a tooltip, a pick that adds rather than fills, and Backspace in the empty box taking the last. */
export const List: Story = () => {
  const [value, setValue] = useState('');
  // One entry too long for the control: cut off, its whole text in a tooltip.
  const [entries, setEntries] = useState([
    'Hedge Fixture',
    'Fixture Bane',
    'Fixturawortiamtestalisfixturawortiamtestalisfixturawortiamtestalisfixturawortiam',
  ]);
  const add = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) setEntries((current) => [...current, trimmed]);
    setValue('');
  };
  const removeAt = (index: number) =>
    setEntries((current) => current.filter((_, at) => at !== index));
  return (
    <Combobox
      id="folk-name"
      label="Folk Name"
      value={value}
      onChange={setValue}
      onPick={add}
      onCommit={add}
      onRemoveLast={() => removeAt(entries.length - 1)}
      suggestions={{ options: NAMES, pending: false }}
      entries={
        entries.length > 0 && (
          <ul className="combobox__entries">
            {entries.map((entry, index) => (
              <ComboboxEntry key={entry} value={entry} onRemove={() => removeAt(index)} />
            ))}
          </ul>
        )
      }
      clear={
        entries.length > 0
          ? { label: 'Clear Folk Names', onClear: () => setEntries([]) }
          : undefined
      }
    />
  );
};

/** A box with no source yet: it never opens, and Enter adds as Add does. */
export const NoSource: Story = () => {
  const [value, setValue] = useState('');
  return (
    <Combobox id="colour" label="Colour" value={value} onChange={setValue} onPick={setValue} />
  );
};

const KINDS = ['Botanical', 'Fungal', 'Zoological', 'Mineral', 'Chemical', 'Unknown', 'None'].map(
  (label) => ({ value: label.toLowerCase(), label }),
);

/** The select-only box: a closed set on the same control and list, nothing typed, a placeholder until a choice is made. */
export const SelectOnly: Story = () => {
  const [value, setValue] = useState('');
  return (
    <>
      <label id="classification-label" htmlFor="classification">
        Classification
      </label>
      <ComboboxSelect
        id="classification"
        label="Classification"
        labelId="classification-label"
        value={value}
        onChange={setValue}
        choices={KINDS}
        placeholder="Choose a classification"
      />
    </>
  );
};
