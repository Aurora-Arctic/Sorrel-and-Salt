import type { Story } from '@ladle/react';
import { type ReactNode, useId, useState } from 'react';
import { type FieldErrors, FormProvider, useForm } from 'react-hook-form';
import {
  FORM_GROUP_ICONS,
  type FormGroupIcon,
} from '../../modules/vocabulary/schema/form-group-icons';
import FormIcon from '../FormIcon';
import {
  FieldShell,
  FilterSelectField,
  FormActions,
  ReasonField,
  SearchField,
  RadioGroupField,
  SwitchField,
  TextField,
  fieldDescription,
} from '.';

// Render-only; the fields are exercised by the forms that use them
// (IngredientForm, the admin forms, NameForm, EmailForm). Each TextField sits
// in a react-hook-form `FormProvider`, as it does in a form; the error is put
// in the form's state rather than found by a resolver. The hint's tip opens
// on hover, a tap, or the ⓘ's focus.
export default {
  title: 'Forms / Field',
};

interface Values {
  name: string;
}

const Form = ({ errors, children }: { errors?: FieldErrors<Values>; children: ReactNode }) => {
  const methods = useForm<Values>({ defaultValues: { name: 'Testwort' }, errors });
  return (
    <FormProvider {...methods}>
      <form className="form" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
        {children}
      </form>
    </FormProvider>
  );
};

export const Default: Story = () => (
  <Form>
    <TextField<Values> name="name" label="Name" autoComplete="off" />
  </Form>
);

export const Required: Story = () => (
  <Form>
    <TextField<Values> name="name" label="Name" required autoComplete="off" />
  </Form>
);

export const WithHint: Story = () => (
  <Form>
    <TextField<Values>
      name="name"
      label="Name"
      hint="What the ingredient is called in this compendium. Its formal name is its identity."
      autoComplete="off"
    />
  </Form>
);

export const WithNote: Story = () => (
  <Form>
    <TextField<Values>
      name="name"
      label="Name"
      note="Shut while the formal name is being checked."
      disabled
    />
  </Form>
);

export const WithError: Story = () => (
  <Form errors={{ name: { type: 'server', message: 'Testwort is already taken.' } }}>
    <TextField<Values> name="name" label="Name" required autoComplete="off" />
  </Form>
);

export const Multiline: Story = () => (
  <Form>
    <TextField<Values> name="name" label="Description" multiline />
  </Form>
);

export const Disabled: Story = () => (
  <Form>
    <TextField<Values> name="name" label="Name" disabled />
  </Form>
);

// A plain-state form's own control in the same shell: the ids and the
// attributes come from `fieldDescription`, the control is the caller's.
export const PlainShell: Story = () => {
  const { aria, ...field } = fieldDescription({
    id: useId(),
    error: 'Enter a name.',
  });
  return (
    <div className="form" style={{ maxWidth: '32rem' }}>
      <FieldShell label="Your Name" required {...field}>
        <input id={field.controlId} className="input" autoComplete="name" aria-required {...aria} />
      </FieldShell>
    </div>
  );
};

// An on-or-off choice as a slide toggle, held in the caller's state as a
// list filter holds it: off, on, and shut either way, each label above its
// toggle as a field's is. Tab to one for the focus ring; press and hold for
// the stretched thumb.
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

export const Switch: Story = () => (
  <div className="form" style={{ maxWidth: '32rem' }}>
    <Toggle label="No Refs" />
    <Toggle label="Needs Approval" on />
    <Toggle label="Off and Shut" disabled />
    <Toggle label="On and Shut" on disabled />
  </div>
);

export const RadioGroup: Story = () => {
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
            label: 'Member',
            description: 'Reads and writes the ingredients and the grimoire.',
          },
          { value: 'viewer', label: 'Viewer', description: 'Reads only.' },
        ]}
      />
    </div>
  );
};

// The strip layout: the same native radios, drawn as one bar of icons, None last.
export const RadioStrip: Story = () => {
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
};

// The segmented layout (M12.4): a text bar, each segment's name with how many
// entries it would leave. The compendium filter's Toxic, and its Match without counts.
export const RadioSegmented: Story = () => {
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
};

// A form's row of actions: Save off until there is something to save, then
// on, then busy; Cancel quiet; Delete apart at the far end on an edit; and a
// form that sends rather than saves, its submit renamed.
const noop = () => {};

export const Actions: Story = () => (
  <div className="form" style={{ maxWidth: '32rem' }}>
    <FormActions noun="Group" dirty={false} submitting={false} onCancel={noop} />
    <FormActions noun="Group" dirty submitting={false} onCancel={noop} onDelete={noop} />
    <FormActions noun="Group" dirty submitting onCancel={noop} onDelete={noop} />
    <FormActions
      noun="Invitation"
      label="Send Invitation"
      busyLabel="Sending"
      dirty
      submitting={false}
      onCancel={noop}
    />
  </div>
);

// An admin change's optional Reason, held in plain state, its hint behind the ⓘ.
export const Reason: Story = () => {
  const [reason, setReason] = useState('');
  return (
    <div className="form" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
      <ReasonField value={reason} onChange={setReason} />
    </div>
  );
};

// A list filter's search box, its submit the magnifier at its end, named
// Search. Its form goes nowhere here: a filter's FilterForm opens the list
// (Forms / Filter Form). Tab past the text for the submit's focus ring.
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

export const SearchBox: Story = () => <Search />;

// A list filter's closed set as the browser draws it once hydrated: the
// select-only box, its blank first choice no filter, and the same set typed
// into, as the curated lists' group is. The server draws each as a native
// select at the same width, so hydration moves nothing. Each applies nowhere
// here: a filter's FilterForm opens the list (Forms / Filter Form).
const GROUPS = [
  { value: 'fixture-substance', label: 'Fixture Substance' },
  { value: 'testwort-wards', label: 'Testwort Wards' },
  { value: 'mockish', label: 'Mockish' },
];

export const FilterSelect: Story = () => (
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
);
