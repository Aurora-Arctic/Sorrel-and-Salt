import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UnitConverter from '@/components/HelpWidget/unit-converter';
import { CONVERSION_REFUSALS } from '@/components/HelpWidget/conversion-refusals';
import { UNITS } from '@/modules/ingredients/schema/units';
import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import { unitLabel } from '@/components/StockFields/units';
import type { Unit } from '@/modules/ingredients/schema/units';
import { choose } from '../../support/interact';

// The help pages' converter: the answer is the app's own `unitConvert`, so a cross-dimension or count pair shows
// the app's refusal, never a blank, a NaN or a guess.

function convert(amount: string, from: Unit, to: Unit): HTMLElement {
  render(<UnitConverter />);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount' }), {
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
