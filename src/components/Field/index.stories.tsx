import type { Story } from '@ladle/react';
import { type ReactNode, useId, useState } from 'react';
import { type FieldErrors, FormProvider, useForm } from 'react-hook-form';
import { FieldShell, SwitchField, TextField, fieldDescription } from '.';

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
    <Toggle label="Without References" />
    <Toggle label="Needs Approval" on />
    <Toggle label="Off and Shut" disabled />
    <Toggle label="On and Shut" on disabled />
  </div>
);
