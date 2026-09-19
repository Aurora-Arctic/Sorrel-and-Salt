import { describe, expect, it } from 'vitest';
import { mergeFixture, stated } from './merge';

// The cases where "merge" and "replace" disagree, each a decision:
// claude-docs/testing.md, "Overrides merge; arrays replace".

describe('mergeFixture', () => {
  it('keeps every default the override does not mention', () => {
    const merged = mergeFixture({ name: 'Mugwort', form: 'herb' }, { form: 'root' });

    expect(merged).toEqual({ name: 'Mugwort', form: 'root' });
  });

  it('merges a nested object rather than replacing it', () => {
    const merged = mergeFixture(
      { title: 'Hearth Guard', seal: { color: 'black', wax: 'beeswax' } },
      { seal: { color: 'oxblood' } },
    );

    expect(merged.seal).toEqual({ color: 'oxblood', wax: 'beeswax' });
  });

  // `makeIngredient({ categories: ['protection'] })` is filed under protection
  // and nothing else.
  it('replaces an array rather than merging it element by element', () => {
    const merged = mergeFixture(
      { categories: ['Dream Work', 'Divination', 'Psychic Work'] },
      { categories: ['Protection'] },
    );

    expect(merged.categories).toEqual(['Protection']);
  });

  // `undefined` is what an absent optional property reads as; `{ form: maybe }`
  // must not erase a default.
  it('treats undefined as saying nothing, and null as saying null', () => {
    const merged = mergeFixture(
      { form: 'herb' as string | null, planet: 'Moon' as string | null },
      { form: undefined, planet: null },
    );

    expect(merged.form).toBe('herb');
    expect(merged.planet).toBeNull();
  });

  // Two fixtures from the same defaults must share no array or nested object.
  it('gives every call its own copy of the nested defaults', () => {
    const defaults = { categories: ['Protection'], seal: { color: 'black' } };

    const first = mergeFixture(defaults, {});
    const second = mergeFixture(defaults, {});

    expect(first.categories).not.toBe(second.categories);
    expect(first.seal).not.toBe(second.seal);
    first.categories.push('Warding');
    expect(second.categories).toEqual(['Protection']);
    expect(defaults.categories).toEqual(['Protection']);
  });

  it('merges nothing when given no overrides at all', () => {
    expect(mergeFixture({ name: 'Mugwort' }, {})).toEqual({ name: 'Mugwort' });
  });
});

// A field the caller named is theirs, even as `null`.
describe('stated', () => {
  it('is true for a key the override names', () => {
    expect(stated({ canonicalName: 'Artemisia vulgaris' }, 'canonicalName')).toBe(true);
  });

  it('is true for a key the override names as null', () => {
    expect(stated({ canonicalName: null }, 'canonicalName')).toBe(true);
  });

  it('is false for a key the override omits, or sets to undefined', () => {
    expect(stated({}, 'canonicalName')).toBe(false);
    expect(stated({ canonicalName: undefined }, 'canonicalName')).toBe(false);
  });
});
