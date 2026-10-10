import { describe, expect, it } from 'vitest';
import { addressTaken, joinAnd, plural } from '@/lib/text';

// The English a refusal is phrased in (MB.210): one counting rule and one
// list rule for every service, so a refusal never says "1 forms" or lists
// with a serial comma.

describe('plural', () => {
  it('takes the singular for one and the plural for any other count', () => {
    expect([0, 1, 2].map((count) => plural(count, 'form', 'forms'))).toEqual([
      'forms',
      'form',
      'forms',
    ]);
  });
});

describe('joinAnd', () => {
  it('lists none, one, two and several as a sentence does', () => {
    expect(joinAnd([])).toBe('');
    expect(joinAnd(['A'])).toBe('A');
    expect(joinAnd(['A', 'B'])).toBe('A and B');
    expect(joinAnd(['A', 'B', 'C'])).toBe('A, B and C');
  });
});

describe('addressTaken', () => {
  it('names the holder, the address and the remedy in that order', () => {
    const sentence = addressTaken('HOLDER', 'the-slug', 'REMEDY');

    expect(sentence.indexOf('HOLDER')).toBe(0);
    expect(sentence.indexOf('"the-slug"')).toBeGreaterThan(0);
    expect(sentence.endsWith('REMEDY')).toBe(true);
  });
});
