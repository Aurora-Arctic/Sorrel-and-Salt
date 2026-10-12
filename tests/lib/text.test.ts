import { describe, expect, it } from 'vitest';
import { addressTaken, capitalise, joinAnd, noMatchText, plural } from '@/lib/text';

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
  it('names the holder, the address and the remedy', () => {
    const sentence = addressTaken('HOLDER', 'the-slug', 'REMEDY');

    expect(sentence).toContain('HOLDER');
    expect(sentence).toContain('the-slug');
    expect(sentence).toContain('REMEDY');
  });
});

describe('capitalise', () => {
  it('raises the first letter and leaves the rest as written', () => {
    expect(capitalise('the form “oil”')).toBe('The form “oil”');
    expect(capitalise('nOTE')).toBe('NOTE');
    expect(capitalise('')).toBe('');
  });
});

// The admin lists' empty state (MB.115): the filters are the caller's, so the
// test checks they all reach the sentence, joined as a list, and that an
// unfiltered list gets the caller's own text untouched.
describe('noMatchText', () => {
  it('names every filter in force, joined as a list, and the noun', () => {
    const sentence = noMatchText('NOUNS', ['FIRST', 'SECOND', 'THIRD'], 'EMPTY');

    expect(sentence).toContain('NOUNS');
    expect(sentence).toContain(joinAnd(['FIRST', 'SECOND', 'THIRD']));
    expect(sentence).not.toContain('EMPTY');
  });

  it('gives the empty text when no filter is in force', () => {
    expect(noMatchText('NOUNS', [], 'EMPTY')).toBe('EMPTY');
  });
});
