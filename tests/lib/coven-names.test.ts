import { describe, expect, it } from 'vitest';
import { repeatedCovenNames } from '@/lib/coven-names';

// Coven names are not unique, only addresses are: a member of two covens of one name tells them apart by address.

describe('repeatedCovenNames', () => {
  it('names each name two or more of the covens share, once', () => {
    const repeated = repeatedCovenNames([
      { name: 'Fixture Coven' },
      { name: 'Testwort Circle' },
      { name: 'Fixture Coven' },
      { name: 'Fixture Coven' },
    ]);

    expect([...repeated]).toEqual(['Fixture Coven']);
  });

  it('names none when every name is unique, or there are no covens', () => {
    expect(repeatedCovenNames([{ name: 'Fixture Coven' }, { name: 'Testwort Circle' }]).size).toBe(
      0,
    );
    expect(repeatedCovenNames([]).size).toBe(0);
  });

  it('matches names exactly, so a difference of case or spacing is a different name', () => {
    expect(
      repeatedCovenNames([
        { name: 'Fixture Coven' },
        { name: 'fixture coven' },
        { name: 'Fixture  Coven' },
      ]).size,
    ).toBe(0);
  });
});
