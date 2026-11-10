import { describe, expect, it } from 'vitest';
import { optionalText, requiredText } from '@/lib/validation';
import { formatQuantity, parseQuantity, showQuantity, tidy, withScheme } from '@/lib/formats';

describe('tidy', () => {
  it('trims the ends and collapses runs of white space to one space', () => {
    expect(tidy('  Salt   of\t the  earth  ')).toBe('Salt of the earth');
  });
  it('leaves already tidy text as it is', () => {
    expect(tidy('Salt')).toBe('Salt');
  });
});

describe('withScheme', () => {
  it('adds https to a bare host and leaves a full address alone', () => {
    expect(withScheme('example.com/a')).toBe('https://example.com/a');
    expect(withScheme('http://example.com')).toBe('http://example.com');
  });
});

describe('the server schemas store what the form showed', () => {
  it('requiredText collapses inner runs of spaces as the form does', () => {
    expect(requiredText('Give a name').parse('  Salt   wort ')).toBe('Salt wort');
  });
  it('optionalText collapses inner runs of spaces and turns a blank into null', () => {
    expect(optionalText().parse('  Salt   wort ')).toBe('Salt wort');
    expect(optionalText().parse('   ')).toBeNull();
  });
});

describe('parseQuantity', () => {
  it('reads digits with at most one point, after dropping commas', () => {
    expect(parseQuantity('2.5')).toBe(2.5);
    expect(parseQuantity(' 2.5 ')).toBe(2.5);
    expect(parseQuantity('2.')).toBe(2);
    expect(parseQuantity('.5')).toBe(0.5);
    expect(parseQuantity('0')).toBe(0);
  });
  it('drops every comma as a thousands separator, so a decimal comma reads as a larger number', () => {
    expect(parseQuantity('1,000')).toBe(1000);
    expect(parseQuantity('1,000.5')).toBe(1000.5);
    expect(parseQuantity('2,5')).toBe(25);
    expect(parseQuantity('1.000,5')).toBe(1.0005);
    expect(parseQuantity(',')).toBeNaN();
  });
  it('reads blank as no amount', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
  });
  it('reads anything else as not a number, so the rule can refuse it', () => {
    for (const text of ['abc', '1e3', '1.2.3', '1,2.3.4', '0x10', '2 5', '.', '-']) {
      expect(parseQuantity(text), text).toBeNaN();
    }
  });
  it('keeps a minus sign so a negative is told apart from a typo', () => {
    expect(parseQuantity('-2')).toBe(-2);
  });
});

describe('showQuantity', () => {
  it('adds thousands separators and pads no decimals', () => {
    expect(showQuantity(1000)).toBe('1,000');
    expect(showQuantity(2.5)).toBe('2.5');
    expect(showQuantity(0.125)).toBe('0.125');
  });
  it('reads back as the number it shows', () => {
    for (const amount of [0, 7, 1000, 1234567.5, 0.001]) {
      expect(parseQuantity(showQuantity(amount))).toBe(amount);
    }
  });
});

describe('formatQuantity', () => {
  it('shows an amount as its canonical number', () => {
    expect(formatQuantity(' 2.50 ')).toBe('2.5');
    expect(formatQuantity('007')).toBe('7');
    expect(formatQuantity('5.')).toBe('5');
    expect(formatQuantity('1000')).toBe('1,000');
    expect(formatQuantity('1234567.5')).toBe('1,234,567.5');
    expect(formatQuantity('2,5')).toBe('25');
    expect(formatQuantity('0.250')).toBe('0.25');
  });
  it('leaves what it cannot read exactly as typed, for the rule to refuse', () => {
    expect(formatQuantity('abc')).toBe('abc');
    expect(formatQuantity('1.2.3')).toBe('1.2.3');
  });
  it('never rounds away a decimal past the third, which the rule refuses', () => {
    expect(formatQuantity('1.2345')).toBe('1.2345');
    expect(formatQuantity(' 1000.0001 ')).toBe('1000.0001');
  });
  it('empties blank text', () => {
    expect(formatQuantity('  ')).toBe('');
  });
});
