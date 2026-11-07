import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { type ReactNode, createRef, useEffect, useId, useRef, useState } from 'react';
import { type FieldErrors, FormProvider, useForm } from 'react-hook-form';
import {
  FORM_GROUP_ICONS,
  type FormGroupIcon,
} from '../../modules/vocabulary/schema/form-group-icons';
import { StatesGrid } from '../../../.storybook/states-grid';
import FormIcon from '../FormIcon';
import {
  FieldShell,
  FilterSelectField,
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  type FormHistory,
  ReasonField,
  SearchField,
  RadioGroupField,
  SelectField,
  SwitchField,
  TextField,
  fieldDescription,
} from '.';

const meta = {
  title: 'Forms / Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

interface Values {
  name: string;
  group: string;
}

const Form = ({ errors, children }: { errors?: FieldErrors<Values>; children: ReactNode }) => {
  const methods = useForm<Values>({
    defaultValues: { name: 'Testwort', group: '' },
    resolver: async (values) => (errors ? { values: {}, errors } : { values, errors: {} }),
  });
  const { handleSubmit } = methods;
  useEffect(() => {
    if (errors) void handleSubmit(() => {})();
  }, [errors, handleSubmit]);
  return (
    <FormProvider {...methods}>
      <form className="form" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
        {children}
      </form>
    </FormProvider>
  );
};

const GROUP_OPTIONS = [
  { value: 'fixture-substance', label: 'Fixture Substance' },
  { value: 'testwort-wards', label: 'Testwort Wards' },
  { value: 'mockish', label: 'Mockish' },
];
const ICON_OPTIONS = GROUP_OPTIONS.map((option) => ({
  ...option,
  icon: <span aria-hidden="true">*</span>,
}));
const NOTED_OPTIONS = [
  GROUP_OPTIONS[0],
  { ...GROUP_OPTIONS[1], disabled: true, note: 'Already held by this coven.' },
  GROUP_OPTIONS[2],
];

const TAKEN = { name: { type: 'server', message: 'Testwort is already taken.' } };

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="24rem"
      states={{
        Plain: (
          <Form>
            <TextField<Values> name="name" label="Name" autoComplete="off" />
          </Form>
        ),
        Required: (
          <Form>
            <TextField<Values> name="name" label="Name" required autoComplete="off" />
          </Form>
        ),
        Pending: (
          <Form>
            <TextField<Values> name="name" label="Name" autoComplete="off" busy />
          </Form>
        ),
        'With Hint': (
          <Form>
            <TextField<Values>
              name="name"
              label="Name"
              hint="What the ingredient is called in this compendium. Its formal name is its identity."
              autoComplete="off"
            />
          </Form>
        ),
        'With Note': (
          <Form>
            <TextField<Values>
              name="name"
              label="Name"
              note="Shut while the formal name is being checked."
              disabled
            />
          </Form>
        ),
        'With Error': (
          <Form errors={TAKEN}>
            <TextField<Values> name="name" label="Name" required autoComplete="off" />
          </Form>
        ),
        Multiline: (
          <Form>
            <TextField<Values> name="name" label="Description" multiline />
          </Form>
        ),
        Disabled: (
          <Form>
            <TextField<Values> name="name" label="Name" disabled />
          </Form>
        ),
        'With Label Suffix': (
          <Form>
            <TextField<Values> name="name" label="Quantity" labelSuffix="Flower" />
          </Form>
        ),
        'With Placeholder': (
          <Form>
            <TextField<Values> name="name" label="Name" placeholder="Add a name" />
          </Form>
        ),
        'Tall Multiline': (
          <Form>
            <TextField<Values> name="name" label="Description" multiline rows={10} />
          </Form>
        ),
        'Date Type': (
          <Form>
            <TextField<Values> name="name" label="Retrieved" type="date" />
          </Form>
        ),
        'Number Type': (
          <Form>
            <TextField<Values> name="name" label="Quantity" type="number" />
          </Form>
        ),
        'With Action': (
          <Form>
            <TextField<Values>
              name="name"
              label="Name"
              action={
                <button type="button" className="btn btn--quiet btn--small">
                  Copy From Ingredient
                </button>
              }
            />
          </Form>
        ),
        'With Content After The Error': (
          <Form errors={TAKEN}>
            <TextField<Values>
              name="name"
              label="Name"
              after={<p>A similar name is held in the compendium.</p>}
            />
          </Form>
        ),
        'Described By Another Element': (
          <Form>
            <p id="held-warning">Another entry holds this name.</p>
            <TextField<Values> name="name" label="Name" describedBy="held-warning" />
          </Form>
        ),
        'Marked Invalid Without An Error': (
          <Form>
            <TextField<Values> name="name" label="Name" invalid />
          </Form>
        ),
        'Select With Placeholder': (
          <Form>
            <SelectField<Values>
              name="group"
              label="Group"
              placeholder="Choose a group"
              options={GROUP_OPTIONS}
            />
          </Form>
        ),
        'Select With Option Icons': (
          <Form>
            <SelectField<Values> name="group" label="Group" options={ICON_OPTIONS} />
          </Form>
        ),
        'Select With A Disabled Option': (
          <Form>
            <SelectField<Values>
              name="group"
              label="Group"
              placeholder="Choose a group"
              options={NOTED_OPTIONS}
            />
          </Form>
        ),
        'Select Disabled': (
          <Form>
            <SelectField<Values>
              name="group"
              label="Group"
              placeholder="Choose a group"
              options={GROUP_OPTIONS}
              disabled
            />
          </Form>
        ),
        'Select With Typeahead': (
          <Form>
            <SelectField<Values>
              name="group"
              label="Tradition"
              placeholder="Type a tradition"
              options={GROUP_OPTIONS}
              typeahead
            />
          </Form>
        ),
        'Select Required With Hint': (
          <Form>
            <SelectField<Values>
              name="group"
              label="Group"
              hint="Which group the ingredient sits in."
              placeholder="Choose a group"
              options={GROUP_OPTIONS}
              required
            />
          </Form>
        ),
      }}
    />
  ),
};

export const PlainShell: Story = {
  render: () => {
    const { aria, ...field } = fieldDescription({
      id: useId(),
      error: 'Enter a name.',
    });
    return (
      <div className="form" style={{ maxWidth: '32rem' }}>
        <FieldShell label="Your Name" required {...field}>
          <input
            id={field.controlId}
            className="input"
            autoComplete="name"
            aria-required
            {...aria}
          />
        </FieldShell>
      </div>
    );
  },
};

const Toggle = ({
  label,
  on = false,
  disabled,
}: {
  label: string;
  on?: boolean;
  disabled?: boolean;
}) => {
  const [checked, setChecked] = useState(on);
  return (
    <SwitchField
      label={label}
      name="flag"
      value="1"
      checked={checked}
      onChange={setChecked}
      disabled={disabled}
    />
  );
};

export const Switch: Story = {
  render: () => (
    <div className="form" style={{ maxWidth: '32rem' }}>
      <Toggle label="No Refs" />
      <Toggle label="Needs Approval" on />
      <Toggle label="Off and Shut" disabled />
      <Toggle label="On and Shut" on disabled />
    </div>
  ),
};

export const RadioGroup: Story = {
  render: () => {
    const [role, setRole] = useState<'member' | 'viewer'>('member');
    return (
      <div className="form" style={{ maxWidth: '32rem' }}>
        <RadioGroupField
          legend="New Role"
          name="role"
          value={role}
          onChange={setRole}
          options={[
            {
              value: 'member',
              label: 'Practitioner',
              description: 'Reads and writes the ingredients and the grimoire.',
            },
            { value: 'viewer', label: 'Observer', description: 'Reads only.' },
          ]}
        />
      </div>
    );
  },
};

export const RadioStrip: Story = {
  render: () => {
    const [icon, setIcon] = useState<FormGroupIcon | ''>('');
    return (
      <div className="form" style={{ maxWidth: '24rem' }}>
        <RadioGroupField<FormGroupIcon | ''>
          legend="Icon"
          name="icon"
          layout="strip"
          value={icon}
          onChange={setIcon}
          note="The icon drawn beside each form in this group. None draws the generic one."
          options={[
            ...FORM_GROUP_ICONS.map((name) => ({
              value: name,
              label: name.charAt(0).toUpperCase() + name.slice(1),
              icon: <FormIcon name={name} />,
            })),
            { value: '', label: 'None', icon: <FormIcon name={null} /> },
          ]}
        />
      </div>
    );
  },
};

export const RadioSegmented: Story = {
  render: () => {
    const [toxic, setToxic] = useState('any');
    const [match, setMatch] = useState('all');
    return (
      <div className="form" style={{ maxWidth: '24rem' }}>
        <RadioGroupField<string>
          legend="Match"
          name="categoryMode"
          hint="All: an ingredient must be in every chosen category. Any: in at least one of them."
          layout="segmented"
          value={match}
          onChange={setMatch}
          options={[
            { value: 'all', label: 'All' },
            { value: 'any', label: 'Any' },
          ]}
        />
        <RadioGroupField<string>
          legend="Toxic"
          name="toxic"
          layout="segmented"
          value={toxic}
          onChange={setToxic}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'toxic', label: 'Toxic', count: 4 },
            { value: 'not-toxic', label: 'Not Toxic', count: 8 },
          ]}
        />
      </div>
    );
  },
};

export const RadioCards: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div className="form" style={{ maxWidth: '40rem' }}>
        <RadioGroupField<string>
          legend="What Is This About?"
          name="about"
          layout="cards"
          value={value}
          onChange={setValue}
          error={value === null ? 'Choose what this is about.' : undefined}
          options={[
            { value: 'bug', label: 'Bug', description: 'Something is broken or behaves wrongly.' },
            {
              value: 'feedback',
              label: 'Feedback',
              description: 'An idea or a comment on the site.',
            },
            { value: 'question', label: 'Question', description: 'Something you need explained.' },
          ]}
        />
      </div>
    );
  },
};

export const RadioSegmentedDisabled: Story = {
  render: () => (
    <div className="form" style={{ maxWidth: '24rem' }}>
      <RadioGroupField<string>
        legend="Toxic"
        name="toxic-disabled"
        layout="segmented"
        disabled
        hint="Every matching entry shares the same toxicity, so this filter cannot narrow further."
        value="any"
        onChange={() => {}}
        options={[
          { value: 'any', label: 'Any' },
          { value: 'toxic', label: 'Toxic', count: 0 },
          { value: 'not-toxic', label: 'Not Toxic', count: 8 },
        ]}
      />
    </div>
  ),
};

const noop = () => {};

type ActionHandlers = { onCancel: () => void; onDelete: () => void; onSave: () => void };

export const Actions: StoryObj<ActionHandlers> = {
  args: { onCancel: fn(), onDelete: fn(), onSave: fn() },
  render: ({ onCancel, onDelete, onSave }) => (
    <div className="form" style={{ maxWidth: '32rem' }}>
      <FormActions noun="Group" dirty={false} submitting={false} onCancel={onCancel} />
      <FormActions noun="Group" dirty submitting={false} onCancel={onCancel} onDelete={onDelete} />
      <FormActions noun="Group" dirty submitting onCancel={onCancel} onDelete={onDelete} />
      <FormActions
        noun="Group"
        dirty
        submitting
        onCancel={onCancel}
        onDelete={onDelete}
        holdCancel
      />
      <FormActions
        noun="Invitation"
        label="Send Invitation"
        busyLabel="Sending"
        dirty
        submitting={false}
        onCancel={onCancel}
      />
      <FormActions noun="Group" dirty submitting={false} onSave={onSave} onCancel={onCancel}>
        <button type="button" className="btn">
          Save And Add Another
        </button>
      </FormActions>
      <FormActions
        noun="Annotation"
        dirty
        submitting={false}
        onCancel={onCancel}
        saveValue="annotate"
        aside={
          <button type="button" className="btn btn--quiet">
            More
          </button>
        }
      />
    </div>
  ),
};

type InUseArgs = ActionHandlers & {
  status: 'editing' | 'saving' | 'saved' | 'cancelled' | 'deleted';
};

export const ActionsInUse: StoryObj<InUseArgs> = {
  args: { onCancel: fn(), onDelete: fn(), onSave: fn(), status: 'editing' },
  argTypes: {
    status: { control: 'select', options: ['editing', 'saving', 'saved', 'cancelled', 'deleted'] },
  },
  render: function Render({ onCancel, onDelete, onSave, status }) {
    const [, updateArgs] = useArgs<InUseArgs>();
    const [value, setValue] = useState('Testwort');
    const [saved, setSaved] = useState('Testwort');
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    if (status === 'deleted') return <output>The group was deleted.</output>;
    return (
      <form
        className="form"
        style={{ maxWidth: '32rem' }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
          updateArgs({ status: 'saving' });
          timer.current = setTimeout(() => {
            setSaved(value);
            updateArgs({ status: 'saved' });
          }, 600);
        }}
      >
        <label>
          Name
          <input
            className="input"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              updateArgs({ status: 'editing' });
            }}
          />
        </label>
        <FormActions
          noun="Group"
          dirty={value !== saved}
          submitting={status === 'saving'}
          onCancel={() => {
            onCancel();
            setValue(saved);
            updateArgs({ status: 'cancelled' });
          }}
          onDelete={() => {
            onDelete();
            updateArgs({ status: 'deleted' });
          }}
        />
        <output>{status}</output>
      </form>
    );
  },
};
const history = (canUndo: boolean, canRedo: boolean): FormHistory => ({
  undo: noop,
  redo: noop,
  canUndo,
  canRedo,
  clear: noop,
  announcement: '',
  undoButton: createRef<HTMLButtonElement>(),
  redoButton: createRef<HTMLButtonElement>(),
});

export const HistoryButtons: Story = {
  render: () => (
    <StatesGrid
      cell="12rem"
      states={{
        'Both Ready': (
          <FormHistoryContext.Provider value={history(true, true)}>
            <FormHistoryButtons />
          </FormHistoryContext.Provider>
        ),
        'Nothing To Undo Or Redo': (
          <FormHistoryContext.Provider value={history(false, false)}>
            <FormHistoryButtons />
          </FormHistoryContext.Provider>
        ),
      }}
    />
  ),
};

export const Reason: Story = {
  render: () => {
    const [reason, setReason] = useState('');
    return (
      <div className="form" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
        <ReasonField value={reason} onChange={setReason} />
      </div>
    );
  },
};

const Search = () => {
  const [query, setQuery] = useState('');
  return (
    <form
      className="form"
      style={{ maxWidth: '32rem' }}
      onSubmit={(event) => event.preventDefault()}
    >
      <SearchField
        label="Name"
        name="query"
        placeholder="Search names"
        value={query}
        onChange={setQuery}
      />
    </form>
  );
};

export const SearchBox: Story = { render: () => <Search /> };

const GROUPS = [
  { value: 'fixture-substance', label: 'Fixture Substance' },
  { value: 'testwort-wards', label: 'Testwort Wards' },
  { value: 'mockish', label: 'Mockish' },
];

export const FilterSelect: Story = {
  render: () => (
    <form
      className="filter-row"
      style={{ maxWidth: '48rem' }}
      onSubmit={(event) => event.preventDefault()}
    >
      <FilterSelectField
        label="Group"
        name="group"
        all="All Groups"
        options={GROUPS}
        defaultValue=""
        onChange={noop}
      />
      <FilterSelectField
        label="Tradition"
        name="tradition"
        all="All Traditions"
        options={GROUPS}
        defaultValue="testwort-wards"
        onChange={noop}
        typeahead
      />
    </form>
  ),
};
