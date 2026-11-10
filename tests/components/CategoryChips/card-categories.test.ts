import { describe, expect, it } from 'vitest';
import { cardCategoryReader } from '@/components/CategoryChips/card-categories';
import type { KnownCategory } from '@/components/CategoryChips/types';

// The chips a card draws from the categories it was assigned, looked up among the categories the page read.

const HERB = { colorDark: '#123', colorLight: '#abc' };
const ROOT = { colorDark: '#456', colorLight: '#def' };
const KNOWN: KnownCategory[] = [
  { id: 'c-calming', name: 'Calming', group: HERB },
  { id: 'c-warming', name: 'Warming', group: ROOT },
];

describe('cardCategoryReader', () => {
  const read = cardCategoryReader(KNOWN);

  it('draws each assigned category as a chip in the order it was assigned, not the order it was read', () => {
    expect(read([{ id: 'c-warming' }, { id: 'c-calming' }])).toEqual([
      { category: { id: 'c-warming', name: 'Warming' }, group: ROOT },
      { category: { id: 'c-calming', name: 'Calming' }, group: HERB },
    ]);
  });

  it('leaves out a category the page did not read, rather than drawing a nameless chip', () => {
    expect(read([{ id: 'c-unknown' }, { id: 'c-calming' }])).toEqual([
      { category: { id: 'c-calming', name: 'Calming' }, group: HERB },
    ]);
  });

  it('carries the forms a category was assigned through, and no forms key when there are none', () => {
    const [withForms, without, empty] = read([
      { id: 'c-calming', forms: ['Leaf', 'Oil'] },
      { id: 'c-warming' },
      { id: 'c-warming', forms: [] },
    ]);
    expect(withForms.forms).toEqual(['Leaf', 'Oil']);
    expect(without).not.toHaveProperty('forms');
    expect(empty).not.toHaveProperty('forms');
  });

  it('answers no chips for no assigned categories', () => {
    expect(read([])).toEqual([]);
  });
});
