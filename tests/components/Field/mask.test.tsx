import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PlainTextField, TextField } from '@/components/Field';
import { type Deletion, applyMask } from '@/components/Field/mask';
import { phoneMask } from '@/lib/phone-number';

describe('applyMask', () => {
  const type = (previous: string, text: string, caret = text.length, deletion: Deletion = null) =>
    applyMask(phoneMask, { previous, text, caret, deletion });

  it('formats as digits arrive and keeps the caret at the end of what was typed', () => {
    expect(type('', '2')).toEqual({ value: '2', caret: 1 });
    expect(type('20', '202')).toEqual({ value: '(202)', caret: 5 });
    expect(type('(202)', '(202)5')).toEqual({ value: '(202) 5', caret: 7 });
  });
  it('keeps the caret beside the digit it was beside when a digit is inserted in the middle', () => {
    // "(202) 555-012" with a 9 typed after the first 2: caret is after the 9.
    const result = type('(202) 555-012', '(2902) 555-012', 3);
    expect(result.value).toBe('(290) 255-5012');
    expect(result.caret).toBe(3);
  });
  it('takes pasted text, formatted or not', () => {
    expect(type('', '2025550123').value).toBe('(202) 555-0123');
    expect(type('', '(202) 555-0123').value).toBe('(202) 555-0123');
    expect(type('', '+44 7700 900123')).toEqual({ value: '+44 7700 900123', caret: 15 });
  });
  it('lets Backspace delete the digit before a character the mask added, instead of sticking', () => {
    // Caret was after "(202) "; Backspace removed the space.
    const result = type('(202) 5', '(202)5', 5, 'backward');
    expect(result.value).toBe('(205)');
    expect(result.caret).toBe(3);
    // Caret after "(202)" at the end; Backspace removed ")".
    expect(type('(202)', '(202', 4, 'backward')).toEqual({ value: '20', caret: 2 });
  });
  it('lets Delete remove the digit after a character the mask added', () => {
    const result = type('(202) 555', '(202)555', 5, 'forward');
    expect(result.value).toBe('(202) 55');
  });
  it('deletes an ordinary digit as the person asked', () => {
    expect(type('(202) 555', '(202) 55', 8, 'backward').value).toBe('(202) 55');
  });
  it('leaves text with a letter as typed', () => {
    expect(type('', '202x')).toEqual({ value: '202x', caret: 4 });
  });
  it('Backspace in the middle removes the digit before the caret and leaves the caret where it was', () => {
    // "(202) 555-0123", caret after the second 5, Backspace removed that 5.
    expect(type('(202) 555-0123', '(202) 55-0123', 7, 'backward')).toEqual({
      value: '(202) 550-123',
      caret: 7,
    });
  });
  it('Delete in the middle removes the digit after the caret and keeps the caret still', () => {
    expect(type('(202) 555-0123', '(202) 55-0123', 7, 'forward')).toEqual({
      value: '(202) 550-123',
      caret: 7,
    });
  });
  it('typing over a selected run of digits puts the new digit there, with the caret after it', () => {
    // "555" selected and "7" typed.
    expect(type('(202) 555-0123', '(202) 7-0123', 7)).toEqual({
      value: '(202) 701-23',
      caret: 7,
    });
  });
  it('deleting a selection that spans a mask character removes the digits in it', () => {
    // "2) 5" selected (a digit, ")", a space, a digit) and deleted.
    expect(type('(202) 555-0123', '(2055-0123', 3, 'backward')).toEqual({
      value: '(205) 501-23',
      caret: 3,
    });
  });
});

// The caret is set with the value, as the browser has it when the input event fires.
const input = (
  field: HTMLInputElement,
  text: string,
  caret = text.length,
  inputType = 'insertText',
) => {
  fireEvent.input(field, {
    target: { value: text, selectionStart: caret, selectionEnd: caret },
    inputType,
  });
};

function Plain() {
  const [value, setValue] = useState('');
  return (
    <PlainTextField label="Phone" type="tel" mask={phoneMask} value={value} onChange={setValue} />
  );
}

function Hooked() {
  const methods = useForm({ defaultValues: { phone: '' } });
  return (
    <FormProvider {...methods}>
      <TextField name="phone" label="Phone" type="tel" mask={phoneMask} />
    </FormProvider>
  );
}

const box = () => screen.getByRole('textbox', { name: 'Phone' }) as HTMLInputElement;

describe.each([
  ['PlainTextField', Plain],
  ['TextField', Hooked],
])('%s with a mask', (_name, Host) => {
  it('shows the formatted value while the person types, with the caret after the last digit', async () => {
    render(<Host />);
    await act(async () => input(box(), '2025550123'));
    expect(box().value).toBe('(202) 555-0123');
    expect(box().selectionStart).toBe(14);
  });
  it('takes a pasted number from another country in its own form', async () => {
    render(<Host />);
    await act(async () => input(box(), '+44 7700 900123', 15, 'insertFromPaste'));
    expect(box().value).toBe('+44 7700 900123');
  });
  it('deletes through a character the mask added', async () => {
    render(<Host />);
    await act(async () => input(box(), '2025'));
    expect(box().value).toBe('(202) 5');
    // Backspace on the 5, then on the space the mask added.
    await act(async () => input(box(), '(202) ', 6, 'deleteContentBackward'));
    expect(box().value).toBe('(202)');
    await act(async () => input(box(), '(202', 4, 'deleteContentBackward'));
    expect(box().value).toBe('20');
  });
  it('keeps a letter on screen rather than dropping it', async () => {
    render(<Host />);
    await act(async () => input(box(), '202x'));
    expect(box().value).toBe('202x');
  });
});
