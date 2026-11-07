import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UnitConverter from '@/components/HelpWidget/unit-converter';
import { CONVERSION_REFUSALS } from '@/components/HelpWidget/conversion-refusals';
import { UNITS } from '@/modules/ingredients/schema/units';
import { unitConvert } from '@/modules/ingredients/validation/unit-convert';

// The help pages' converter: the answer is the app's own `unitConvert`, so a cross-dimension or count pair shows
// the app's refusal, never a blank, a NaN or a guess.

function convert(amount: string, from: string, to: string): HTMLElement {
  render(<UnitConverter />);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount' }), {
    target: { value: amount },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'From' }), { target: { value: from } });
  fireEvent.change(screen.getByRole('combobox', { name: 'To' }), { target: { value: to } });
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

  it('asks for an amount rather than converting a blank or negative one', () => {
    const blank = convert('', 'g', 'kg');
    expect(blank).not.toHaveTextContent('NaN');
    expect(blank).not.toHaveTextContent(/\d/);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount' }), {
      target: { value: '-1' },
    });
    expect(screen.getByRole('status', { name: 'Result' })).not.toHaveTextContent(/\d/);
  });

  it('offers every unit the app knows on both sides', () => {
    render(<UnitConverter />);

    const from = screen.getByRole('combobox', { name: 'From' });
    const to = screen.getByRole('combobox', { name: 'To' });
    expect(within(from).getAllByRole('option')).toHaveLength(UNITS.length);
    expect(within(to).getAllByRole('option')).toHaveLength(UNITS.length);
  });
});
