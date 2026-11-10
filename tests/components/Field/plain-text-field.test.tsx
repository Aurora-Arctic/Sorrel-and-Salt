import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PlainTextField } from '@/components/Field';
import type { PlainTextFieldProps } from '@/components/Field/types';

function Host(props: Partial<PlainTextFieldProps>) {
  const [value, setValue] = useState('');
  return <PlainTextField label="Note" {...props} value={value} onChange={setValue} />;
}

const box = () => screen.getByRole('textbox', { name: 'Note' }) as HTMLInputElement;

const typeValue = (value: string) =>
  act(async () => {
    fireEvent.change(box(), { target: { value } });
  });

describe('PlainTextField', () => {
  it('shows the value the caller holds and reports each change', async () => {
    render(<Host />);
    await typeValue('Sage');
    expect(box().value).toBe('Sage');
  });
  it('tidies on blur by default when single-line, and trims only the ends when multiline', async () => {
    const { unmount } = render(<Host />);
    await typeValue('  a   b ');
    await act(async () => {
      box().focus();
      box().blur();
    });
    expect(box().value).toBe('a b');
    unmount();
    render(<Host multiline />);
    await typeValue('  a   b ');
    await act(async () => {
      box().focus();
      box().blur();
    });
    expect(box().value).toBe('a   b');
  });
  it('uses the format it is given', async () => {
    render(<Host format={(t) => t.toUpperCase()} />);
    await typeValue('sage');
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
    await typeValue('a'.repeat(12));
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
  describe('check', () => {
    const tooShort = (value: string) =>
      value.length < 3 ? 'Enter at least three letters' : undefined;
    const leave = () =>
      act(async () => {
        box().focus();
        box().blur();
      });
    const errorText = () =>
      (box().getAttribute('aria-describedby')?.split(' ') ?? [])
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');

    it('stays quiet while the first value is typed, then flags a bad one when the box is left', async () => {
      render(<Host check={tooShort} />);
      await typeValue('ab');
      expect(box()).not.toBeInvalid();
      await leave();
      expect(box()).toBeInvalid();
      expect(errorText()).toContain('Enter at least three letters');
    });
    it('re-checks as it is typed once it has flagged, and clears once the value passes', async () => {
      render(<Host check={tooShort} />);
      await typeValue('ab');
      await leave();
      await typeValue('abc');
      expect(box()).not.toBeInvalid();
      await typeValue('a');
      expect(box()).toBeInvalid();
    });
    it('checks the value as the format left it', async () => {
      render(<Host check={tooShort} format={(text) => `${text}xx`} />);
      await typeValue('a');
      await leave();
      expect(box().value).toBe('axx');
      expect(box()).not.toBeInvalid();
    });
    it('leaves an empty box quiet when it is left, so a required one is flagged only on Save', async () => {
      const check = vi.fn(() => 'Enter something');
      render(<Host check={check} />);
      await leave();
      expect(box()).not.toBeInvalid();
      await typeValue('ab');
      await leave();
      expect(box()).toBeInvalid();
      await typeValue('');
      expect(box()).not.toBeInvalid();
    });
    it("shows the caller's error over its own", async () => {
      render(<Host check={tooShort} error="That name is taken" />);
      await typeValue('ab');
      await leave();
      expect(errorText()).toContain('That name is taken');
      expect(errorText()).not.toContain('Enter at least three letters');
    });
  });
});
