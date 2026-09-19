import { describe, expect, it } from 'vitest';
import { mergeFixture, stated } from './merge';

// M1.25 — the one rule every factory is built on: an override says what this
// test is about, and everything it does not mention keeps the default.
//
// The interesting cases are the ones where "merge" and "replace" disagree, and
// each of them is a decision rather than an accident: a nested object merges
// key by key, an array replaces wholesale, and `undefined` is not a value.

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

  // The counterpart decision, and the one DESIGN.md §11's own example turns on:
  // `makeIngredient({ categories: ['protection'] })` must be filed under
  // protection and nothing else. Merging element by element would leave the
  // default's later entries in place and the test would be about three
  // categories it never named.
  it('replaces an array rather than merging it element by element', () => {
    const merged = mergeFixture(
      { categories: ['Dream Work', 'Divination', 'Psychic Work'] },
      { categories: ['Protection'] },
    );

    expect(merged.categories).toEqual(['Protection']);
  });

  // `undefined` is what an absent optional property reads as, so treating it as
  // a value would make `{ form: someOptional }` erase a default whenever the
  // caller's own variable happened to be unset.
  it('treats undefined as saying nothing, and null as saying null', () => {
    const merged = mergeFixture(
      { form: 'herb' as string | null, planet: 'Moon' as string | null },
      { form: undefined, planet: null },
    );

    expect(merged.form).toBe('herb');
    expect(merged.planet).toBeNull();
  });

  // Two fixtures built from the same defaults must not share the arrays and
  // objects inside them — a test that pushes a category onto one would
  // otherwise be changing the next test's fixture. The same reason asUser
  // returns a fresh session per call.
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

// What the factories ask before deriving a field: did the caller *name* this,
// or is it ours to fill in? A field the caller named is theirs even when the
// value they gave is null — which is how a test writes a row the database is
// supposed to reject.
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
