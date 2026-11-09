import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, type ReactNode, useId, useState } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { StatesGrid } from '../../../.storybook/states-grid';
import FormIcon from '../FormIcon';
import { FieldShell, fieldDescription } from '../Field';
import { MagnifierIcon } from '../Field/icons';
import Combobox, { ComboboxEntry, ComboboxMultiSelect, ComboboxSelect } from '.';
import { ComboboxSortableEntries } from './sortable';
import { ComboboxTypeahead } from './typeahead';
import type { ComboboxOption } from './types';

const noop = () => {};

const meta = {
  title: 'Forms / Combobox',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Labelled({
  label,
  children,
}: {
  label: string;
  children: (ids: { id: string; labelId: string }) => ReactNode;
}): ReactElement {
  const field = fieldDescription({ id: useId() });
  return (
    <div className="form" style={{ maxWidth: '32rem' }}>
      <FieldShell label={label} {...field}>
        {children({ id: field.controlId, labelId: field.labelId })}
      </FieldShell>
    </div>
  );
}

const FORMS: ComboboxOption[] = [
  {
    value: 'Wax',
    label: 'Wax (Animal)',
    icon: <FormIcon name="animal" />,
    note: 'Used by Testwort (Fixtura testalis)',
    curated: true,
  },
  {
    value: 'Wax',
    label: 'Wax (Substance)',
    icon: <FormIcon name="substance" />,
    note: 'Candle and poppet wax.',
    curated: true,
  },
  { value: 'Ointment', label: 'Ointment (Preparation)', note: 'A salve or balm.', curated: true },
  {
    value: 'wax shavings',
    icon: <FormIcon name={null} />,
    note: 'Used by Mockleaf',
    curated: false,
  },
];

const NAMES: ComboboxOption[] = [
  { value: 'Hedge Fixture', note: 'Used by Testwort (Fixtura testalis)' },
  { value: 'Fixture Bane', note: 'Used by Mockleaf, Fixturewort' },
];

export const EmptyMessage: Story = {
  render: () => {
    const [value, setValue] = useState('zzz');
    usePressOnMount('Show Name suggestions');
    return (
      <Labelled label="Name">
        {(ids) => (
          <Combobox
            {...ids}
            label="Name"
            value={value}
            onChange={setValue}
            onPick={setValue}
            offerTyped={false}
            suggestions={{ options: [], pending: false }}
            empty="No Matches"
          />
        )}
      </Labelled>
    );
  },
};

export const TwoBuckets: Story = {
  render: () => {
    const [value, setValue] = useState('');
    usePressOnMount('Show Form suggestions');
    return (
      <Labelled label="Form">
        {(ids) => (
          <Combobox
            {...ids}
            label="Form"
            value={value}
            onChange={setValue}
            onPick={setValue}
            suggestions={{ options: FORMS, pending: false }}
            placeholder="Add a form"
          />
        )}
      </Labelled>
    );
  },
};

export const Qualifier: Story = {
  render: () => {
    const [value, setValue] = useState('Wax');
    const [picked, setPicked] = useState<{ value: string; text: string; detail?: string } | null>({
      value: 'Wax',
      text: 'Substance',
      detail: 'Candle and poppet wax.',
    });
    return (
      <Labelled label="Form">
        {(ids) => (
          <Combobox
            {...ids}
            label="Form"
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
        )}
      </Labelled>
    );
  },
};

const ListView = () => {
  const [value, setValue] = useState('');
  const [entries, setEntries] = useState([
    'Hedge Fixture',
    'Fixture Bane',
    'Fixturawortiamtestalisfixturawortiamtestalisfixturawortiamtestalisfixturawortiam',
  ]);
  usePressOnMount('Show Folk Name suggestions');
  const add = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) setEntries((current) => [...current, trimmed]);
    setValue('');
  };
  const removeAt = (index: number) =>
    setEntries((current) => current.filter((_, at) => at !== index));
  return (
    <Labelled label="Folk Name">
      {(ids) => (
        <Combobox
          {...ids}
          label="Folk Name"
          placeholder="Add a folk name"
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
      )}
    </Labelled>
  );
};

export const FolkNameList: Story = { render: ListView };

export const Sortable: Story = {
  render: () => {
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
      <Labelled label="Celestial Body">
        {(ids) => (
          <Combobox
            {...ids}
            label="Celestial Body"
            placeholder="Add a celestial body"
            value={value}
            onChange={setValue}
            onPick={add}
            onCommit={add}
            onRemoveLast={() => removeAt(entries.length - 1)}
            entries={
              entries.length > 0 && (
                <ComboboxSortableEntries
                  entries={entries.map((entry, index) => ({
                    ...entry,
                    onRemove: () => removeAt(index),
                  }))}
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
        )}
      </Labelled>
    );
  },
};

export const CreateRow: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [made, setMade] = useState(0);
    usePressOnMount('Show Reference suggestions');
    return (
      <Labelled label="Reference">
        {(ids) => (
          <>
            <Combobox
              {...ids}
              label="Reference"
              value={value}
              onChange={setValue}
              onPick={setValue}
              suggestions={{ options: NAMES, pending: false }}
              action={{ label: 'New Reference', onSelect: () => setMade((count) => count + 1) }}
              placeholder="Search references"
            />
            {made > 0 && <output className="story-note">New Reference picked {made}×.</output>}
          </>
        )}
      </Labelled>
    );
  },
};

export const NoSource: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Labelled label="Colour">
        {(ids) => (
          <Combobox
            {...ids}
            label="Colour"
            value={value}
            onChange={setValue}
            onPick={setValue}
            placeholder="Type a colour"
          />
        )}
      </Labelled>
    );
  },
};

const KINDS = ['Botanical', 'Fungal', 'Zoological', 'Mineral', 'Chemical', 'Unknown', 'None'].map(
  (label) => ({ value: label.toLowerCase(), label }),
);

export const SelectOnly: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Labelled label="Classification">
        {(ids) => (
          <ComboboxSelect
            {...ids}
            label="Classification"
            value={value}
            onChange={setValue}
            choices={KINDS}
            placeholder="Choose a classification"
          />
        )}
      </Labelled>
    );
  },
};

export const SelectWithIcons: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Labelled label="Group">
        {(ids) => (
          <ComboboxSelect
            {...ids}
            label="Group"
            value={value}
            onChange={setValue}
            choices={[
              { value: 'mineral', label: 'Fixture Mineral', icon: <FormIcon name="mineral" /> },
              { value: 'animal', label: 'Fixture Animal', icon: <FormIcon name="animal" /> },
              { value: 'none', label: 'Fixture Plain', icon: <FormIcon name={null} /> },
            ]}
            placeholder="Choose a group"
          />
        )}
      </Labelled>
    );
  },
};

const TRADITIONS = ['Fixtural', 'Mockish', 'Old Testic', 'Stubbish', 'Testwardish'].map(
  (label) => ({ value: label.toLowerCase(), label }),
);

export const Typeahead: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Labelled label="Tradition">
        {(ids) => (
          <>
            <ComboboxTypeahead
              {...ids}
              label="Tradition"
              value={value}
              onChange={setValue}
              choices={TRADITIONS}
              placeholder="Choose a tradition"
            />
            <p>Value: {value || '(none)'}</p>
          </>
        )}
      </Labelled>
    );
  },
};

const ELEMENTS = ['Earth', 'Air', 'Fire', 'Water', 'Spirit'].map((label) => ({
  value: label.toLowerCase(),
  label,
}));

export const MultiSelect: Story = {
  render: () => {
    const [values, setValues] = useState(['fire', 'air']);
    return (
      <Labelled label="Element">
        {(ids) => (
          <ComboboxMultiSelect
            {...ids}
            label="Element"
            values={values}
            onChange={setValues}
            choices={ELEMENTS}
            placeholder="Choose elements"
          />
        )}
      </Labelled>
    );
  },
};

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

export const QualifierInForm: Story = { render: () => <QualifiedField /> };

export const Leading: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Labelled label="Name">
        {(ids) => (
          <Combobox
            {...ids}
            label="Name"
            value={value}
            onChange={setValue}
            onPick={setValue}
            placeholder="Search names"
            toggle={false}
            leading={
              <button type="button" className="combobox__indicator" aria-label="Search">
                <MagnifierIcon />
              </button>
            }
          />
        )}
      </Labelled>
    );
  },
};

export const LoadingSearch: Story = {
  render: () => {
    const [value, setValue] = useState('moon');
    return (
      <Labelled label="Name">
        {(ids) => (
          <Combobox
            {...ids}
            label="Name"
            value={value}
            onChange={setValue}
            onPick={setValue}
            suggestions={{ options: [], pending: true }}
            placeholder="Search names"
          />
        )}
      </Labelled>
    );
  },
};

export const LoadingSelect: Story = {
  render: () => {
    const [value, setValue] = useState('fungal');
    return (
      <Labelled label="Classification">
        {(ids) => (
          <ComboboxSelect
            {...ids}
            label="Classification"
            value={value}
            onChange={setValue}
            choices={KINDS}
            busy
            placeholder="Choose a classification"
          />
        )}
      </Labelled>
    );
  },
};

const GROUPED: ComboboxOption[] = [
  {
    value: 'Testward',
    heading: 'Wards & Fixtures',
    colors: { colorDark: '#8fb4e8', colorLight: '#2a5aa0' },
    count: 12,
  },
  {
    value: 'Mockward',
    heading: 'Wards & Fixtures',
    colors: { colorDark: '#8fb4e8', colorLight: '#2a5aa0' },
    count: 3,
  },
  {
    value: 'Stubleaf',
    heading: 'Herbs',
    colors: { colorDark: '#9ad39a', colorLight: '#2d6a2d' },
    count: 7,
  },
  {
    value: 'Fixturewort',
    heading: 'Herbs',
    colors: { colorDark: '#9ad39a', colorLight: '#2d6a2d' },
    disabled: true,
    note: 'Already on this list.',
  },
];

export const GroupedRows: Story = {
  render: () => {
    const [value, setValue] = useState('te');
    usePressOnMount('Show Category categories');
    return (
      <Labelled label="Category">
        {(ids) => (
          <Combobox
            {...ids}
            label="Category"
            noun="categorie"
            value={value}
            onChange={setValue}
            onPick={setValue}
            suggestions={{ options: GROUPED, pending: false }}
            highlightFirst
            required
            typedIcon={<span aria-hidden="true">+</span>}
            placeholder="Add a category"
          />
        )}
      </Labelled>
    );
  },
};

const GLYPH = <span aria-hidden="true">*</span>;

export const EntryChips: Story = {
  render: () => (
    <StatesGrid
      cell="20rem"
      states={{
        Plain: (
          <ul className="combobox__entries">
            <ComboboxEntry value="Hedge Fixture" onRemove={noop} />
          </ul>
        ),
        'With A Summary': (
          <ul className="combobox__entries">
            <ComboboxEntry
              value="Mockwort"
              onRemove={noop}
              summary={{
                label: 'About Mockwort (Fixtura vulgaris)',
                content: () => <p>A fixture herb, used in tests.</p>,
              }}
            />
          </ul>
        ),
        Outlined: (
          <ul className="combobox__entries">
            <ComboboxEntry value="Water" outlined onRemove={noop} />
          </ul>
        ),
        'With A Count': (
          <ul className="combobox__entries">
            <ComboboxEntry value="Water" count={7} onRemove={noop} />
          </ul>
        ),
        'Count Loading': (
          <ul className="combobox__entries">
            <ComboboxEntry value="Water" loading onRemove={noop} />
          </ul>
        ),
        'Naming What It Removes': (
          <ul className="combobox__entries">
            <ComboboxEntry value="Water" removeNoun="Element" onRemove={noop} />
          </ul>
        ),
        'Named By The List Error': (
          <ul className="combobox__entries">
            <ComboboxEntry value="Hedge Fixture" errorId="folk-name-error" onRemove={noop} />
          </ul>
        ),
        'With An Action': (
          <ul className="combobox__entries">
            <ComboboxEntry
              value="Hedge Fixture"
              onRemove={noop}
              action={{
                label: 'Make Hedge Fixture the Display Name',
                tip: 'Make Display Name',
                icon: GLYPH,
                onClick: noop,
              }}
            />
          </ul>
        ),
        'With An Action Shut': (
          <ul className="combobox__entries">
            <ComboboxEntry
              value="Hedge Fixture"
              onRemove={noop}
              action={{
                label: 'Make Hedge Fixture the Display Name',
                tip: 'Make Display Name',
                icon: GLYPH,
                onClick: noop,
                disabled: true,
              }}
            />
          </ul>
        ),
        'With An Icon': (
          <ul className="combobox__entries">
            <ComboboxEntry value="Wax" icon={<FormIcon name="animal" />} onRemove={noop} />
          </ul>
        ),
        'With A Qualifier And Detail': (
          <ul className="combobox__entries">
            <ComboboxEntry
              value="Testward"
              qualifier="Wards & Fixtures"
              detail="Dried leaf · Compendium entry"
              onRemove={noop}
            />
          </ul>
        ),
        'Coloured By Its Group': (
          <ul className="combobox__entries">
            <ComboboxEntry
              value="Testward"
              colors={{ colorDark: '#8fb4e8', colorLight: '#2a5aa0' }}
              onRemove={noop}
            />
          </ul>
        ),
      }}
    />
  ),
};
