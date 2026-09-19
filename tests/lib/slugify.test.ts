import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slugify';

// These pin the *options* rather than the package's own behaviour — the
// package has its own tests. What would break silently is someone changing
// `strict` or the charmap extension in slugify.ts, so each case below is one
// of those two decisions showing its work.
describe('slugify', () => {
  it('lowercases and hyphenates the ordinary case', () => {
    expect(slugify('Nightmare Protection')).toBe('nightmare-protection');
  });

  it('leaves an already-hyphenated name alone but for its case', () => {
    expect(slugify('Hex-Breaking')).toBe('hex-breaking');
    expect(slugify('Self-Love')).toBe('self-love');
  });

  // Seven of DESIGN.md §6's eight group names carry an ampersand, so this is
  // the case that decides what a group slug looks like. The package expands it.
  it('expands an ampersand to "and" rather than dropping it', () => {
    expect(slugify('Protection & Defense')).toBe('protection-and-defense');
    expect(slugify('Craft & Change')).toBe('craft-and-change');
  });

  it('transliterates accented letters instead of stripping them', () => {
    expect(slugify('Yarrow Blüte')).toBe('yarrow-blute');
    expect(slugify('Élderflower')).toBe('elderflower');
  });

  // The one charmap extension slugify.ts applies: without it `strict` drops
  // the underscore and welds the two words into `griefwork`.
  it('treats an underscore as a separator, not as nothing', () => {
    expect(slugify('grief_work')).toBe('grief-work');
  });

  it('collapses runs of whitespace and trims the ends', () => {
    expect(slugify('shadow   work')).toBe('shadow-work');
    expect(slugify('  Wellbeing  ')).toBe('wellbeing');
  });

  it('drops punctuation without welding the words either side together', () => {
    expect(slugify("Cat's Claw")).toBe('cats-claw');
    expect(slugify('Legal Matters (Civil)')).toBe('legal-matters-civil');
  });

  it('returns an empty string when nothing in the name survives', () => {
    expect(slugify('...')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});
