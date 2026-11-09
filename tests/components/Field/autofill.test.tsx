import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { PlainTextField, TextField } from '@/components/Field';

function Hooked({ autoComplete }: { autoComplete?: 'username' }) {
  const methods = useForm({ defaultValues: { note: '' } });
  return (
    <FormProvider {...methods}>
      <TextField name="note" label="Note" autoComplete={autoComplete} />
    </FormProvider>
  );
}

const note = () => screen.getByRole('textbox', { name: 'Note' });

describe('autofill', () => {
  it('is off by default on TextField, so a password manager fills nothing unasked', () => {
    render(<Hooked />);
    expect(note()).toHaveAttribute('autocomplete', 'off');
  });
  it('is off by default on PlainTextField', () => {
    render(<PlainTextField label="Note" value="" onChange={() => {}} />);
    expect(note()).toHaveAttribute('autocomplete', 'off');
  });
  it('carries the token the caller chose', () => {
    render(<Hooked autoComplete="username" />);
    expect(note()).toHaveAttribute('autocomplete', 'username');
  });
  it('asks 1Password to leave a field alone only when told to', () => {
    const { rerender } = render(<PlainTextField label="Note" value="" onChange={() => {}} />);
    expect(note()).not.toHaveAttribute('data-1p-ignore');
    rerender(<PlainTextField label="Note" value="" onChange={() => {}} ignorePasswordManagers />);
    expect(note()).toHaveAttribute('data-1p-ignore');
  });
});
