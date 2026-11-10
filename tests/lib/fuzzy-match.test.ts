import { describe, expect, it } from 'vitest';
import { fuzzyMatcher } from '@/lib/fuzzy-match';

const ITEMS = [
  { id: 'a', text: 'The jar of Testwort has gone mouldy.' },
  { id: 'b', text: 'Mockroot is out of stock.' },
  { id: 'c', text: 'Fixture balm was moved to the top shelf.' },
];

const ids = (found: readonly { id: string }[]) => found.map((item) => item.id);

describe('fuzzyMatcher', () => {
  const find = fuzzyMatcher(ITEMS, (item) => item.text);

  it('returns every item, in its own order, for blank text', () => {
    expect(ids(find(''))).toEqual(['a', 'b', 'c']);
    expect(ids(find('   '))).toEqual(['a', 'b', 'c']);
  });

  it('matches words in any order, partial words and small typos, best first', () => {
    expect(ids(find('stock mockroot'))[0]).toBe('b');
    expect(ids(find('testw'))[0]).toBe('a');
    expect(ids(find('fixtre shelff'))[0]).toBe('c');
  });

  it('needs every word to match somewhere', () => {
    expect(ids(find('mouldy shelf'))).toEqual([]);
  });

  it('reads search operators as plain text, so a stray mark matches as its word would', () => {
    expect(ids(find("'mockroot"))).toEqual(ids(find('mockroot')));
    expect(ids(find('!mockroot'))).toEqual(ids(find('mockroot')));
    expect(ids(find('mockroot | testwort'))).toEqual(ids(find('mockroot testwort')));
    expect(ids(find('=stock$'))).toEqual(ids(find('stock')));
  });
});
