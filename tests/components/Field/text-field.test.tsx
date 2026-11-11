import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { TextField } from '@/components/Field';
import type { TextFieldProps } from '@/components/Field/types';

type Values = { name: string };

function Form(props: Partial<TextFieldProps<Values>> & { onValues?: (v: Values) => void }) {
  const { onValues, ...field } = props;
  const methods = useForm<Values>({ defaultValues: { name: '' } });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit((v) => onValues?.(v))}>
        <TextField<Values> name="name" label="Name" {...field} />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

const box = () => screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;

async function typeAndLeave(value: string) {
  await act(async () => box().focus());
  await act(async () => {
    fireEvent.change(box(), { target: { value } });
  });
  await act(async () => box().blur());
}

describe('a single-line TextField tidies on blur by default', () => {
  it('trims the ends and collapses runs of spaces', async () => {
    render(<Form />);
    await typeAndLeave('  Salt   wort ');
    expect(box().value).toBe('Salt wort');
  });
  it('uses the format it is given instead', async () => {
    render(<Form format={(text) => text.toUpperCase()} />);
    await typeAndLeave('  sage ');
    expect(box().value).toBe('  SAGE ');
  });
  it('trims only the ends of a multiline field, keeping its spacing', async () => {
    render(<Form multiline />);
    await typeAndLeave('One   two\n\nthree ');
    expect(box().value).toBe('One   two\n\nthree');
  });
});

describe('the limit', () => {
  const typeLength = async (length: number) => {
    await act(async () => {
      fireEvent.change(box(), { target: { value: 'a'.repeat(length) } });
    });
  };
  it('shows nothing until three quarters of it is used', async () => {
    render(<Form limit={20} />);
    await typeLength(10);
    expect(box().getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.queryByText(/left|over/)).toBeNull();
  });
  it('shows what is left near the limit and the overrun past it, and never stops typing', async () => {
    render(<Form limit={20} />);
    await typeLength(18);
    expect(screen.getByText('2 characters left')).toBeTruthy();
    await typeLength(23);
    expect(screen.getByText('3 characters over')).toBeTruthy();
    expect(box().value).toHaveLength(23);
    expect(box().maxLength).toBe(-1);
  });
  it('names the count in the description of the control', async () => {
    render(<Form limit={20} />);
    await typeLength(19);
    const ids = box().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids.some((id) => document.getElementById(id)?.textContent === '1 character left')).toBe(
      true,
    );
  });
  it('refuses Save past the limit and accepts it at the limit', async () => {
    const saved: Values[] = [];
    render(<Form limit={5} onValues={(v) => saved.push(v)} />);
    await typeLength(6);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(saved).toHaveLength(0);
    expect(box().getAttribute('aria-invalid')).toBe('true');
    await typeLength(5);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(saved).toHaveLength(1);
  });
});

describe('browser attributes', () => {
  it('passes typeLength, inputMode, autoComplete, autoCapitalize, spellCheck and enterKeyHint through', () => {
    render(
      <Form
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        autoCapitalize="words"
        spellCheck
        enterKeyHint="next"
      />,
    );
    expect(box().type).toBe('tel');
    expect(box().inputMode).toBe('tel');
    expect(box().autocomplete).toBe('tel');
    expect(box().getAttribute('autocapitalize')).toBe('words');
    expect(box().getAttribute('spellcheck')).toBe('true');
    expect(box().getAttribute('enterkeyhint')).toBe('next');
  });
  it('turns spell-check off and capitalisation off for an email field', () => {
    render(<Form type="email" />);
    expect(box().type).toBe('email');
    expect(box().getAttribute('spellcheck')).toBe('false');
    expect(box().getAttribute('autocapitalize')).toBe('none');
  });
  it('turns spell-check off for a url or tel field but leaves capitalisation alone on tel', () => {
    render(<Form type="tel" />);
    expect(box().getAttribute('spellcheck')).toBe('false');
    expect(box().getAttribute('autocapitalize')).toBeNull();
  });
  it('turns capitalisation off for a url field', () => {
    render(<Form type="url" />);
    expect(box().getAttribute('autocapitalize')).toBe('none');
  });
  it('keeps spell-check on for a multiline field', () => {
    render(<Form multiline />);
    expect(box().getAttribute('spellcheck')).toBe('true');
  });
  it('lets a caller override the defaults', () => {
    render(<Form type="email" spellCheck autoCapitalize="words" />);
    expect(box().getAttribute('spellcheck')).toBe('true');
    expect(box().getAttribute('autocapitalize')).toBe('words');
  });
});
