import type { Story } from '@ladle/react';
import { type ReactElement, useId, useState } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import Combobox, {
  ComboboxEntry,
  ComboboxMultiSelect,
  ComboboxSelect,
  ComboboxSortableEntries,
} from '.';
import { ComboboxTypeahead } from './typeahead';
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
      clear={{
        label: 'Clear Folk Names',
        onClear: () => setEntries([]),
        empty: entries.length === 0,
      }}
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
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((celestialBody) => ({
      id: celestialBody,
      value: celestialBody,
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
      id="celestialBody"
      label="Celestial Body"
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
      clear={{
        label: 'Clear Celestial Bodies',
        onClear: () => setEntries([]),
        empty: entries.length === 0,
      }}
    />
  );
};

/** A box with no source yet: it never opens, and Enter adds as Add does. */
/**
 * A list whose entries can only be picked, the references' (MB.154): its last
 * row makes something new, "New Reference…", whatever is typed, in place of
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
        create={{ label: 'New Reference…', onCreate: () => setMade((count) => count + 1) }}
      />
      {made > 0 && <output className="story-note">New Reference… picked {made}×.</output>}
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

const TRADITIONS = ['Fixtural', 'Mockish', 'Old Testic', 'Stubbish', 'Testwardish'].map(
  (label) => ({ value: label.toLowerCase(), label }),
);

/** The type-ahead box: a closed set typed into, the list narrowing to the choices holding the text, the first highlighted, and only a choice the value. */
export const Typeahead: Story = () => {
  const [value, setValue] = useState('');
  return (
    <>
      <label id="tradition-label" htmlFor="tradition">
        Tradition
      </label>
      <ComboboxTypeahead
        id="tradition"
        label="Tradition"
        labelId="tradition-label"
        value={value}
        onChange={setValue}
        choices={TRADITIONS}
        placeholder="Choose a tradition"
      />
      <p>Value: {value || '(none)'}</p>
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

// A phone's width, in each theme: a list's box, its chips wrapping and the
// long one cut off at the narrower control.
export const PhoneDark: Story = () => <List />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <List />;
PhoneLight.meta = { theme: 'light', width: 375 };

// The qualifier as the ingredient form draws it: the Form box under the field
// before it, "Wax" picked under Substance, with a detail long enough to wrap.
// Focus in the box or a hover on "(Substance)" opens the tooltip above the
// box from its right edge, so the Form label stays clear; the first printable
// key and the list opening close it (MB.115).
const LONG_DETAIL =
  'A long description, as a curated form can carry: what the form is, how it is prepared, and what sets it apart from another form of the same name.';

const QualifiedField = (): ReactElement => {
  const nameField = fieldDescription({ id: useId() });
  const formField = fieldDescription({
    id: useId(),
    hint: 'How it comes: dried leaf, whole root, oil.',
  });
  const [value, setValue] = useState('Wax');
  return (
    <div className="form" style={{ maxWidth: '32rem' }}>
      <FieldShell label="Name" {...nameField}>
        <input
          id={nameField.controlId}
          className="input"
          defaultValue="Testwort"
          {...nameField.aria}
        />
      </FieldShell>
      <FieldShell label="Form" hint="How it comes: dried leaf, whole root, oil." {...formField}>
        <Combobox
          id={formField.controlId}
          label="Form"
          labelId={formField.labelId}
          value={value}
          onChange={setValue}
          onPick={setValue}
          suggestions={{ options: FORMS, pending: false }}
          qualifier={{ text: 'Substance', detail: LONG_DETAIL }}
          {...formField.aria}
        />
      </FieldShell>
    </div>
  );
};

export const QualifierInForm: Story = () => <QualifiedField />;

// At a phone's width, where the tooltip's cap at 60% of the box shows.
export const QualifierInFormPhone: Story = () => <QualifiedField />;
QualifierInFormPhone.meta = { width: 375 };
