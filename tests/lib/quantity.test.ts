import { describe, expect, it } from 'vitest';
import { amountOf, formatQuantity, plainQuantity } from '@/lib/quantity';

describe('plainQuantity', () => {
  // The strings the quantity columns return; the three former copies agreed on every one.
  it.each([
    ['1.000', '1'],
    ['2.500', '2.5'],
    ['0.250', '0.25'],
    ['10.000', '10'],
    ['100', '100'],
    ['0.001', '0.001'],
    ['1000.000', '1000'],
    ['0.000', '0'],
    ['1.50', '1.5'],
    ['-0.50', '-0.5'],
  ])('shows %s as %s', (stored, shown) => {
    expect(plainQuantity(stored)).toBe(shown);
  });

  // Input the copies disagreed on: the string form is kept as typed, never rewritten through Number.
  it.each([
    ['1e3', '1e3'],
    ['.5', '.5'],
    ['+1', '+1'],
    ['007', '007'],
    [' 1 ', '1'],
    ['', ''],
    ['abc', 'abc'],
    ['12345678901234567890.50', '12345678901234567890.5'],
  ])('keeps %j as %j', (typed, shown) => {
    expect(plainQuantity(typed)).toBe(shown);
  });

  it('shows a number as its shortest form', () => {
    expect(plainQuantity(2.5)).toBe('2.5');
    expect(plainQuantity(3)).toBe('3');
  });
});

describe('formatQuantity', () => {
  it('joins the amount and unit with one space', () => {
    expect(formatQuantity('2.500', 'tsp')).toBe('2.5 tsp');
    expect(formatQuantity(3, 'count')).toBe('3 count');
  });

  it('leaves the amount alone with no unit', () => {
    expect(formatQuantity('2.000', null)).toBe('2');
    expect(formatQuantity(4, undefined)).toBe('4');
    expect(formatQuantity(4, '')).toBe('4');
  });
});

describe('amountOf', () => {
  it.each([
    ['2.500', 2.5],
    ['0', 0],
    ['0.000', 0],
    ['10', 10],
    [3, 3],
    [null, null],
  ] as const)('reads a stored amount %j as %j', (stored, amount) => {
    expect(amountOf(stored)).toBe(amount);
  });
});
