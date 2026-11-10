import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FormErrorSummary, TextField } from '@/components/Field';

type Values = { name: string; note: string };

function Form() {
  const methods = useForm<Values>({
    mode: 'onTouched',
    shouldFocusError: false,
    defaultValues: { name: '', note: '' },
    resolver: (async (values) => {
      const errors: Record<string, { type: string; message: string }> = {};
      if (values.name === '') errors.name = { type: 'required', message: 'Enter a name' };
      if (values.note.length > 3) errors.note = { type: 'max', message: 'Keep the note short' };
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    }) as Resolver<Values>,
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(() => undefined)}>
        <FormErrorSummary />
        <TextField name="name" label="Name" required />
        <TextField name="note" label="Note" />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

const clickSave = () => act(async () => screen.getByRole('button', { name: 'Save' }).click());
const summary = () => screen.queryByRole('group', { name: /problem/i });

beforeEach(() => {
  document.title = 'New Thing';
});
afterEach(() => {
  document.title = '';
});

describe('FormErrorSummary', () => {
  it('shows nothing until a save has failed', () => {
    render(<Form />);
    expect(summary()).toBeNull();
    expect(document.title).toBe('New Thing');
  });
  it('lists each error as a link to its field, and takes focus', async () => {
    render(<Form />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'too long' },
    });
    await clickSave();
    const box = summary();
    expect(box).not.toBeNull();
    expect(box).toHaveFocus();
    const links = within(box as HTMLElement).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Enter a name', 'Keep the note short']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `#${screen.getByRole('textbox', { name: /Name/ }).id}`,
      `#${screen.getByRole('textbox', { name: 'Note' }).id}`,
    ]);
  });
  it('moves focus to the field when its link is followed', async () => {
    render(<Form />);
    await clickSave();
    await act(async () => screen.getByRole('link', { name: 'Enter a name' }).click());
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveFocus();
  });
  it('prefixes the document title with Error while errors are listed', async () => {
    render(<Form />);
    await clickSave();
    expect(document.title).toBe('Error: New Thing');
  });
  it('drops an error from the list once it is fixed, and the title once all are', async () => {
    render(<Form />);
    await clickSave();
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), {
        target: { value: 'Sage' },
      });
    });
    expect(summary()).toBeNull();
    expect(document.title).toBe('New Thing');
  });
});
