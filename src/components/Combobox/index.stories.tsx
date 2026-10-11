import type { Story } from '@ladle/react';
import { type ReactElement, useId, useState } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import Combobox, {
  ComboboxEntry,
  ComboboxMultiSelect,
  ComboboxSelect,
  ComboboxSortableEntries,
} from '.';
import type { ComboboxOption } from './types';
import './proposals.scss';

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

// A phone's width, in each theme: a list's box, its chips wrapping and the
// long one cut off at the narrower control.
export const PhoneDark: Story = () => <List />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <List />;
PhoneLight.meta = { theme: 'light', width: 375 };

// MB.115's open call on the qualifier's tooltip (1d.3), side by side; the
// losing stories and `proposals.scss` are deleted at sign-off. Each is the
// ingredient form's Form box as `FormField` draws it, under the field before
// it, with "Wax" picked under Substance and a detail long enough to wrap, the
// tip held open as focus in the box opens it today.
const LONG_DETAIL =
  'A long description, as a curated form can carry: what the form is, how it is prepared, and what sets it apart from another form of the same name.';

const QualifiedField = ({ className }: { className: string }): ReactElement => {
  const nameField = fieldDescription({ id: useId() });
  const formField = fieldDescription({
    id: useId(),
    hint: 'How it comes: dried leaf, whole root, oil.',
  });
  const [value, setValue] = useState('Wax');
  return (
    <div className={`form combobox-proposal ${className}`} style={{ maxWidth: '32rem' }}>
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

/** A: today. Above the box from its left edge, open while the box has focus: it covers the Form label, and the Name box above. */
export const ProposalTipToday: Story = () => <QualifiedField className="" />;

/** B (recommended): above the box from its right edge, under the qualifier, at most 60% of the control's width, so the label stays clear. */
export const ProposalTipRight: Story = () => (
  <QualifiedField className="combobox-proposal--right" />
);

/**
 * C (recommended with B): placed as B, and it also gets out of the way of typing. The tip
 * closes at the first keystroke in the box and when the list opens; focus or a hover on the
 * qualifier opens it again, and Escape closes it. Behaviour, which a static story cannot
 * show: drawn here as B at rest, and built in Phase 2 if chosen. The detail stays in the
 * box's description whichever wins, so a screen reader hears it while typing.
 */
export const ProposalTipCloseOnTyping: Story = () => (
  <>
    <QualifiedField className="combobox-proposal--right" />
    <p className="story-note">
      C: placed as B. Closes at the first keystroke and when the list opens; focus or hover on the
      qualifier reopens it; Escape closes it.
    </p>
  </>
);

/** D: beneath the box, where the list opens too, so the two collide once typing starts. */
export const ProposalTipBelow: Story = () => (
  <QualifiedField className="combobox-proposal--below" />
);

// Each at a phone's width, where the tip's cap at the window shows.
export const ProposalTipTodayPhone: Story = () => <QualifiedField className="" />;
ProposalTipTodayPhone.meta = { width: 375 };

export const ProposalTipRightPhone: Story = () => (
  <QualifiedField className="combobox-proposal--right" />
);
ProposalTipRightPhone.meta = { width: 375 };

export const ProposalTipBelowPhone: Story = () => (
  <QualifiedField className="combobox-proposal--below" />
);
ProposalTipBelowPhone.meta = { width: 375 };
