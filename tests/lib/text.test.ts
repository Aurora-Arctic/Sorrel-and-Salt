import { describe, expect, it } from 'vitest';
import { addressTaken, capitalise, joinAnd, noMatchText, plural, titleCase } from '@/lib/text';

// The English a refusal is phrased in: one counting rule and one list rule for every service,
// so a refusal never says "1 forms" or lists with a serial comma.

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

// The admin lists' empty state: the filters are the caller's, so the test checks they all reach
// the sentence, joined as a list, and that an unfiltered list gets the caller's own text untouched.
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

describe('titleCase', () => {
  it('raises each word', () => {
    expect(titleCase('dried leaf')).toBe('Dried Leaf');
  });

  it('keeps small words lower-case after the first word', () => {
    expect(titleCase('oil of cloves')).toBe('Oil of Cloves');
    expect(titleCase('salt and pepper with a twist')).toBe('Salt and Pepper with a Twist');
  });

  it('raises a small word that opens the text', () => {
    expect(titleCase('the root')).toBe('The Root');
    expect(titleCase('of old')).toBe('Of Old');
  });

  it('raises every part of a hyphenated word', () => {
    expect(titleCase('cold-pressed oil')).toBe('Cold-Pressed Oil');
    expect(titleCase('freeze-dried')).toBe('Freeze-Dried');
  });

  it('leaves a word with a capital inside alone', () => {
    expect(titleCase('pH strip')).toBe('pH Strip');
    expect(titleCase('CBD oil')).toBe('CBD Oil');
  });

  it('collapses extra whitespace and trims', () => {
    expect(titleCase('  whole   root  ')).toBe('Whole Root');
  });

  it('returns the empty string for empty or blank text', () => {
    expect(titleCase('')).toBe('');
    expect(titleCase('   ')).toBe('');
  });

  it('folds to the same identity as the text it came from', () => {
    for (const form of ['dried leaf', 'oil of cloves', 'cold-pressed oil', ' whole root ']) {
      expect(titleCase(form).toLowerCase()).toBe(form.trim().toLowerCase());
    }
  });
});
