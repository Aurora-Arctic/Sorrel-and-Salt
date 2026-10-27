import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { TextField } from '@/components/Field';

// A field's error is drawn when it is left, and pressing another control
// leaves it on the press: the error line pushes the control down before the
// button comes up, so the click misses. What is drawn stands still while a
// button is down: an error just raised waits for the release, and one already
// showing stays, since taking it away would move the controls the other way.

function Form() {
  const methods = useForm({
    mode: 'onTouched',
    defaultValues: { name: '' },
    resolver: async () => ({
      values: {},
      errors: { name: { type: 'required', message: 'Required.' } },
    }),
  });
  return (
    <FormProvider {...methods}>
      <form>
        <TextField name="name" label="Name" />
        <button type="button">Other</button>
      </form>
    </FormProvider>
  );
}

async function leaveName() {
  const name = screen.getByRole('textbox', { name: 'Name' });
  await act(async () => {
    name.focus();
    name.blur();
  });
  return name;
}

describe('a field error and the pointer', () => {
  it('raised during a press, waits for the release', async () => {
    render(<Form />);

    fireEvent.pointerDown(document.body);
    const name = await leaveName();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.pointerUp(document.body);
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('already showing, stays through a press', async () => {
    render(<Form />);
    const name = await leaveName();

    fireEvent.pointerDown(document.body);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    fireEvent.pointerUp(document.body);
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('is released by a cancelled press', async () => {
    render(<Form />);

    fireEvent.pointerDown(document.body);
    const name = await leaveName();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.pointerCancel(document.body);
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('is released by the window losing focus', async () => {
    render(<Form />);

    fireEvent.pointerDown(document.body);
    const name = await leaveName();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.blur(window);
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });
});
