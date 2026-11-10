import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PlainTextField } from '@/components/Field';
import type { PlainTextFieldProps } from '@/components/Field/types';

function Host(props: Partial<PlainTextFieldProps>) {
  const [value, setValue] = useState('');
  return <PlainTextField label="Note" {...props} value={value} onChange={setValue} />;
}

const box = () => screen.getByRole('textbox', { name: 'Note' }) as HTMLInputElement;

const type = (value: string) =>
  act(async () => {
    fireEvent.change(box(), { target: { value } });
  });

describe('PlainTextField', () => {
  it('shows the value the caller holds and reports each change', async () => {
    render(<Host />);
    await type('Sage');
    expect(box().value).toBe('Sage');
  });
  it('tidies on blur by default when single-line, and trims only the ends when multiline', async () => {
    const { unmount } = render(<Host />);
    await type('  a   b ');
    await act(async () => {
      box().focus();
      box().blur();
    });
    expect(box().value).toBe('a b');
    unmount();
    render(<Host multiline />);
    await type('  a   b ');
    await act(async () => {
      box().focus();
      box().blur();
    });
    expect(box().value).toBe('a   b');
  });
  it('uses the format it is given', async () => {
    render(<Host format={(t) => t.toUpperCase()} />);
    await type('sage');
    await act(async () => {
      box().focus();
      box().blur();
    });
    expect(box().value).toBe('SAGE');
  });
  it('names the error in the description and marks the control invalid', () => {
    render(<Host error="Enter a note" />);
    expect(box().getAttribute('aria-invalid')).toBe('true');
    const ids = box().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids.map((id) => document.getElementById(id)?.textContent).join(' ')).toContain(
      'Enter a note',
    );
  });
  it('marks a required field with aria-required', () => {
    render(<Host required />);
    expect(box().getAttribute('aria-required')).toBe('true');
  });
  it('shows the limit count, and never sets a maxlength', async () => {
    render(<Host limit={10} />);
    await type('a'.repeat(12));
    expect(screen.getByText('2 characters over')).toBeTruthy();
    expect(box().maxLength).toBe(-1);
    expect(box().value).toHaveLength(12);
  });
  it('takes the browser attributes and their defaults as TextField does', () => {
    render(<Host type="email" enterKeyHint="send" />);
    expect(box().type).toBe('email');
    expect(box().getAttribute('spellcheck')).toBe('false');
    expect(box().getAttribute('autocapitalize')).toBe('none');
    expect(box().getAttribute('enterkeyhint')).toBe('send');
  });
  it('draws a textarea when multiline', () => {
    render(<Host multiline />);
    expect(box().tagName).toBe('TEXTAREA');
  });
});
