import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { EditedFieldsContext, TextField, useEditedFields } from '@/components/Field';

// A field's error is drawn once the form is submitted, or once the field has been left and edited by the person at some point since the form started.
// "Edited" survives the value returning to empty, which react-hook-form's dirtyFields does not.

type Values = { name: string };

function Form() {
  const methods = useForm<Values>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { name: '' },
    resolver: (async (values) => {
      if (values.name !== '') return { values, errors: {} };
      return { values: {}, errors: { name: { type: 'required', message: 'Required.' } } };
    }) as Resolver<Values>,
  });
  const { edited, clear } = useEditedFields(methods.subscribe);
  return (
    <FormProvider {...methods}>
      <EditedFieldsContext.Provider value={edited}>
        <form onSubmit={methods.handleSubmit(() => undefined)}>
          <TextField name="name" label="Name" />
          <button type="submit">Submit</button>
          <button
            type="button"
            onClick={() => {
              methods.reset({ name: '' });
              clear();
            }}
          >
            Restart
          </button>
        </form>
      </EditedFieldsContext.Provider>
    </FormProvider>
  );
}

const field = () => screen.getByRole('textbox', { name: 'Name' });

async function leave() {
  await act(async () => {
    field().focus();
    field().blur();
  });
}

async function typeThenClear() {
  await act(async () => {
    field().focus();
  });
  await act(async () => {
    fireEvent.change(field(), { target: { value: 'Sage' } });
  });
  await act(async () => {
    fireEvent.change(field(), { target: { value: '' } });
  });
  await act(async () => {
    field().blur();
  });
}

describe('an error waits for the field to be left after an edit', () => {
  it('stays quiet on a field passed through without an edit', async () => {
    render(<Form />);
    await leave();
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    expect(field()).not.toHaveAccessibleDescription();
  });

  it('shows after typing and clearing the field, then leaving it', async () => {
    render(<Form />);
    await typeThenClear();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription();
  });

  it('shows on a field never edited once the form is submitted', async () => {
    render(<Form />);
    await leave();
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    });
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription();
  });

  it('is quiet again for a field edited before the form restarted', async () => {
    render(<Form />);
    await typeThenClear();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    });
    await leave();
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    expect(field()).not.toHaveAccessibleDescription();
  });
});
