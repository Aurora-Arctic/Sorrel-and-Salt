import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UnitConverter from '@/components/HelpWidget/unit-converter';
import { CONVERSION_REFUSALS } from '@/components/HelpWidget/conversion-refusals';
import { UNITS } from '@/modules/ingredients/schema/units';
import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import { unitLabel } from '@/components/StockFields/units';
import type { Unit } from '@/modules/ingredients/schema/units';
import { QUANTITY_FORMAT_MESSAGE, QUANTITY_HINT, quantityProblem } from '@/lib/quantity-rule';
import { choose } from '../../support/interact';

// The help pages' converter: the answer is the app's own `unitConvert`, so a cross-dimension or count pair shows
// the app's refusal, never a blank, a NaN or a guess. It is drawn as an equation, "1 tbsp = 3 tsp", which a screen
// reader skips for the sentence, "1 tbsp is 3 tsp." (claude-docs/components/help-pages.md, "Widgets").

/** What a screen reader reads of an element: its text, less every part hidden from it. */
function spoken(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return copy.textContent ?? '';
}

/** What a sighted reader sees of an element: the parts a screen reader skips for the sentence. */
function drawn(element: HTMLElement): string {
  return [...element.querySelectorAll('[aria-hidden="true"]')]
    .map((part) => part.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const amountBox = () => screen.getByRole('textbox', { name: 'Amount' });

function convert(amount: string, from: Unit, to: Unit): HTMLElement {
  render(<UnitConverter />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
    target: { value: amount },
  });
  choose('From', unitLabel(from));
  choose('To', unitLabel(to));
  return screen.getByRole('status', { name: 'Result' });
}

describe('UnitConverter', () => {
  it('gives the app’s result for two units of one dimension', () => {
    const result = convert('2', 'tbsp', 'tsp');

    const expected = unitConvert(2, 'tbsp', 'tsp');
    expect(expected.ok).toBe(true);
    expect(result).toHaveTextContent(String(expected.ok && expected.value));
  });

  it('gives the app’s rounded result for weight', () => {
    const result = convert('1', 'oz', 'g');

    const expected = unitConvert(1, 'oz', 'g');
    expect(result).toHaveTextContent(String(expected.ok && expected.value));
  });

  it.each([
    ['g', 'ml', 'dimension'],
    ['cup', 'kg', 'dimension'],
    ['piece', 'g', 'count'],
    ['ml', 'pinch', 'count'],
  ] as const)('refuses %s to %s with the app’s %s refusal', (from, to, reason) => {
    const result = convert('3', from, to);

    expect(unitConvert(3, from, to)).toEqual({ ok: false, reason });
    expect(result).toHaveTextContent(CONVERSION_REFUSALS[reason]);
    expect(result).not.toHaveTextContent('NaN');
  });

  it('draws the answer as an equation and reads it as the sentence', () => {
    const result = convert('1', 'tbsp', 'tsp');

    const expected = unitConvert(1, 'tbsp', 'tsp');
    const value = String(expected.ok && expected.value);
    expect(drawn(result)).toBe(`1 tbsp = ${value} tsp`);
    expect(spoken(result)).toBe(`1 tbsp is ${value} tsp.`);
  });

  it('keeps the equation on a refusal, with a dash for the answer and the app’s sentence beneath', () => {
    const result = convert('3', 'tbsp', 'g');

    const sentence = CONVERSION_REFUSALS.dimension;
    expect(drawn(result)).toBe(`3 tbsp = — Cannot convert ${sentence}`);
    expect(spoken(result)).toBe(sentence);
  });

  it('asks for an amount rather than converting a blank or negative one', () => {
    const blank = convert('', 'g', 'kg');
    expect(blank).not.toHaveTextContent('NaN');
    expect(blank).not.toHaveTextContent(/\d/);
    expect(drawn(blank)).toBe('— g = —');

    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '-1' },
    });
    const negative = screen.getByRole('status', { name: 'Result' });
    expect(spoken(negative)).not.toMatch(/\d/);
    expect(drawn(negative)).toBe('— g = —');
  });

  it('reads an amount with thousands separators and refuses letters', () => {
    const grouped = convert('1,000', 'g', 'kg');
    expect(spoken(grouped)).toBe('1000 g is 1 kg.');

    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: 'abc' },
    });
    const letters = screen.getByRole('status', { name: 'Result' });
    expect(spoken(letters)).not.toMatch(/\d/);
    expect(letters).not.toHaveTextContent('NaN');
  });

  it('gives the amount the stock box’s hint', () => {
    render(<UnitConverter />);

    expect(amountBox()).toHaveAccessibleDescription(expect.stringContaining(QUANTITY_HINT));
  });

  it('flags letters when the amount is left, linked to the field, and draws a dash for it', () => {
    const result = convert('abc', 'g', 'kg');
    fireEvent.blur(amountBox());

    expect(amountBox()).toHaveAttribute('aria-invalid', 'true');
    expect(amountBox()).toHaveAccessibleDescription(
      expect.stringContaining(QUANTITY_FORMAT_MESSAGE),
    );
    expect(drawn(result)).toBe('— g = —');
    expect(spoken(result)).not.toMatch(/\d|NaN/);
    const lettersSentence = spoken(result);
    fireEvent.change(amountBox(), { target: { value: '' } });
    expect(lettersSentence).not.toBe(spoken(result));
  });

  it.each(['-2', '1.2345'])(
    'flags %j with the quantity rule’s message when left, and converts none of it',
    (text) => {
      const problem = quantityProblem(text, 'Amount');
      expect(problem).toBeTruthy();
      const result = convert(text, 'g', 'kg');
      fireEvent.blur(amountBox());

      expect(amountBox()).toHaveAttribute('aria-invalid', 'true');
      expect(amountBox()).toHaveAccessibleDescription(expect.stringContaining(problem!));
      expect(drawn(result)).toBe('— g = —');
    },
  );

  it('converts a usable amount and flags nothing when it is left', () => {
    const result = convert('2.5', 'kg', 'g');
    fireEvent.blur(amountBox());

    expect(amountBox()).not.toHaveAttribute('aria-invalid', 'true');
    const expected = unitConvert(2.5, 'kg', 'g');
    expect(spoken(result)).toBe(`2.5 kg is ${expected.ok && expected.value} g.`);
  });

  it('offers every unit the app knows on both sides', () => {
    render(<UnitConverter />);

    for (const side of ['From', 'To']) {
      fireEvent.click(screen.getByRole('combobox', { name: side }));
      const list = screen.getByRole('listbox', { name: `${side} choices` });
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(UNITS.map(unitLabel));
      fireEvent.keyDown(screen.getByRole('combobox', { name: side }), { key: 'Escape' });
    }
  });
});
