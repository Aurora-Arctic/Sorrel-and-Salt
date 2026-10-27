import { describe, expect, it } from 'vitest';
import { deitySlug, formSlug, ingredientSlug, slugify } from '@/lib/slugify';

// These pin the options, not the package: what breaks silently is a change to
// `strict` or the charmap extension.
describe('slugify', () => {
  it('lowercases and hyphenates the ordinary case', () => {
    expect(slugify('Nightmare Protection')).toBe('nightmare-protection');
  });

  // Seven of §6's eight group names carry an ampersand; the package expands it.
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

// MB.80/MB.81: an ingredient's address is its label and its formal name,
// always, so two entries sharing a label are told apart by the name that is
// their identity rather than by insertion order —
// claude-docs/db/ingredient-slugs.md, "Ingredient slugs". A form is no part of
// an entry's address (MB.215), so the slug takes none.
describe('ingredientSlug', () => {
  it('joins the label and the formal name under the one slug rule', () => {
    expect(ingredientSlug("Cat's Claw", 'Uncaria tomentosa')).toBe('cats-claw-uncaria-tomentosa');
    expect(ingredientSlug('Mugwort', 'Artemisia vulgaris')).toBe('mugwort-artemisia-vulgaris');
  });

  it('leaves out a formal name the entry does not declare', () => {
    expect(ingredientSlug('Graveyard Dirt', null)).toBe('graveyard-dirt');
    expect(ingredientSlug('Moon Water', undefined)).toBe('moon-water');
  });

  it('is exactly slugify of the two, so two entries sharing a label are told apart by the formal name', () => {
    expect(ingredientSlug('Valerian', 'Valeriana officinalis')).toBe(
      slugify('Valerian Valeriana officinalis'),
    );
    expect(ingredientSlug("Cat's Claw", 'Uncaria guianensis')).not.toBe(
      ingredientSlug("Cat's Claw", 'Uncaria tomentosa'),
    );
  });
});

// A form's address carries its group (M5.6a), so two live forms called "Wax"
// under two groups hold two addresses, as DESIGN.md §5 lets them.
describe('formSlug', () => {
  it('joins the name and the group under the one slug rule', () => {
    expect(formSlug('Wax', 'Substance')).toBe('wax-substance');
    expect(formSlug('Wax', 'Animal')).toBe('wax-animal');
    expect(formSlug('Fixture Shard', 'Stone & Salt')).toBe('fixture-shard-stone-and-salt');
  });
});

// A deity's address carries its tradition (MB.132), as a form's carries its
// group, so a Greek and a Roman Hecate hold two addresses.
describe('deitySlug', () => {
  it('joins the name and the tradition under the one slug rule', () => {
    expect(deitySlug('Hecate', 'Greek')).toBe('hecate-greek');
    expect(deitySlug('Hecate', 'Roman')).toBe('hecate-roman');
    expect(deitySlug('Manannan mac Lir', 'Irish')).toBe('manannan-mac-lir-irish');
  });
});
