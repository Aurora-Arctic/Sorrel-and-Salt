import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { TextField } from '@/components/Field';

type Values = { name: string };

function Form() {
  const methods = useForm<Values>({
    mode: 'onTouched',
    defaultValues: { name: '' },
    resolver: (async (values) => {
      if (values.name === '') {
        return { values: {}, errors: { name: { type: 'required', message: 'Enter a name' } } };
      }
      if (values.name.length < 3) {
        return { values: {}, errors: { name: { type: 'min', message: 'Too short' } } };
      }
      return { values, errors: {} };
    }) as Resolver<Values>,
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(() => undefined)}>
        <TextField name="name" label="Name" required />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

const box = () => screen.getByRole('textbox', { name: /Name/ });
const type = (value: string) =>
  act(async () => {
    fireEvent.change(box(), { target: { value } });
  });
const leave = () =>
  act(async () => {
    box().focus();
    box().blur();
  });

describe('when a field shows its error', () => {
  it('leaves an empty required field quiet when it is left, and flags it on Save', async () => {
    render(<Form />);
    await leave();
    expect(box()).not.toBeInvalid();
    await act(async () => screen.getByRole('button', { name: 'Save' }).click());
    expect(box()).toBeInvalid();
  });
  it('flags a wrong value on leaving, re-checks it as it is typed, and clears it once fixed', async () => {
    render(<Form />);
    await type('ab');
    await leave();
    expect(box()).toBeInvalid();
    await type('abc');
    expect(box()).not.toBeInvalid();
    await type('a');
    expect(box()).toBeInvalid();
  });
});
