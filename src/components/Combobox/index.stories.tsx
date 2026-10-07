import type { Story } from '@ladle/react';
import { useState } from 'react';
import Combobox, {
  ComboboxEntry,
  ComboboxMultiSelect,
  ComboboxSelect,
  ComboboxSortableEntries,
} from '.';
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

/**
 * A pick's qualifier: "Wax" picked under Substance, reading "Wax (Substance)"
 * with the group muted, its description in a tooltip on hover or focus. An edit away from
 * the picked value drops it, as the form's field does (MB.169).
 */
export const Qualifier: Story = () => {
  const [value, setValue] = useState('Wax');
  const [picked, setPicked] = useState<{ value: string; text: string; detail?: string } | null>({
    value: 'Wax',
    text: 'Substance',
    detail: 'Candle and poppet wax.',
  });
  return (
    <>
      <label id="picked-label" htmlFor="picked">
        Form
      </label>
      <Combobox
        id="picked"
        label="Form"
        labelId="picked-label"
        value={value}
        onChange={(text) => {
          setValue(text);
          if (text !== picked?.value) setPicked(null);
        }}
        onPick={(text, option) => {
          setValue(text);
          const group = option?.label?.match(/\((.+)\)$/)?.[1];
          setPicked(group ? { value: text, text: group, detail: option?.note } : null);
        }}
        suggestions={{ options: FORMS, pending: false }}
        qualifier={picked ? { text: picked.text, detail: picked.detail } : undefined}
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

/**
 * A list whose order means something (MB.170): each chip moved by its handle,
 * the grip and text, dragged by pointer, or lifted with Space, moved with the
 * arrows and put down with Space. Enough chips to wrap onto a second row.
 */
export const Sortable: Story = () => {
  const [value, setValue] = useState('');
  const [entries, setEntries] = useState(
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((planet) => ({
      id: planet,
      value: planet,
    })),
  );
  const add = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) setEntries((current) => [...current, { id: trimmed, value: trimmed }]);
    setValue('');
  };
  const removeAt = (index: number) =>
    setEntries((current) => current.filter((_, at) => at !== index));
  const move = (from: number, to: number) =>
    setEntries((current) => {
      const next = [...current];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  return (
    <Combobox
      id="planet"
      label="Planet"
      value={value}
      onChange={setValue}
      onPick={add}
      onCommit={add}
      onRemoveLast={() => removeAt(entries.length - 1)}
      entries={
        entries.length > 0 && (
          <ComboboxSortableEntries
            entries={entries.map((entry, index) => ({ ...entry, onRemove: () => removeAt(index) }))}
            onMove={move}
          />
        )
      }
      clear={
        entries.length > 0 ? { label: 'Clear Planets', onClear: () => setEntries([]) } : undefined
      }
    />
  );
};

/** A box with no source yet: it never opens, and Enter adds as Add does. */
/**
 * A list whose entries can only be picked, the references' (MB.154): its first
 * row makes something new, "Add a reference", whatever is typed, in place of
 * the typed row. Picking it says so beneath the box.
 */
export const CreateRow: Story = () => {
  const [value, setValue] = useState('');
  const [made, setMade] = useState(0);
  return (
    <>
      <Combobox
        id="source"
        label="Reference"
        value={value}
        onChange={setValue}
        onPick={setValue}
        suggestions={{ options: NAMES, pending: false }}
        create={{ label: 'Add a reference', onCreate: () => setMade((count) => count + 1) }}
      />
      {made > 0 && <output className="story-note">Add a reference picked {made}×.</output>}
    </>
  );
};

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

const ELEMENTS = ['Earth', 'Air', 'Fire', 'Water', 'Spirit'].map((label) => ({
  value: label.toLowerCase(),
  label,
}));

/** The multi-select box: a closed set holding several, each choice a chip inside the control with its x, a clear and the chevron on the right, the list offering only what is left, and Backspace taking the last. */
export const MultiSelect: Story = () => {
  const [values, setValues] = useState(['fire', 'air']);
  return (
    <>
      <label id="element-label" htmlFor="element">
        Element
      </label>
      <ComboboxMultiSelect
        id="element"
        label="Element"
        labelId="element-label"
        values={values}
        onChange={setValues}
        choices={ELEMENTS}
        placeholder="Choose elements"
      />
    </>
  );
};
