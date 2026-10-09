import { describe, expect, it } from 'vitest';
import { deitySlug, formSlug, ingredientSlug, slugify } from '@/lib/slugify';

// These pin the options, not the package: what breaks silently is a change to
// `strict` or the charmap extension.
describe('slugify', () => {
  it('lowercases and hyphenates the ordinary case', () => {
    expect(slugify('Nightmare Protection')).toBe('nightmare-protection');
  });

  it('leaves an already-hyphenated name alone but for its case', () => {
    expect(slugify('Hex-Breaking')).toBe('hex-breaking');
    expect(slugify('Self-Love')).toBe('self-love');
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

// MB.80/MB.81: an ingredient's address is its label, its form and its formal
// name, always, so two entries sharing a label and a form are told apart by
// the name that is their identity rather than by insertion order —
// claude-docs/db/ingredient-slugs.md, "Ingredient slugs".
describe('ingredientSlug', () => {
  it('joins the label, the form and the formal name under the one slug rule', () => {
    expect(ingredientSlug("Cat's Claw", 'bark', 'Uncaria tomentosa')).toBe(
      'cats-claw-bark-uncaria-tomentosa',
    );
    expect(ingredientSlug("Cat's Claw", 'bark', 'Uncaria guianensis')).toBe(
      'cats-claw-bark-uncaria-guianensis',
    );
    expect(ingredientSlug('Mugwort', 'herb', 'Artemisia vulgaris')).toBe(
      'mugwort-herb-artemisia-vulgaris',
    );
  });

  it('leaves out what the entry does not declare', () => {
    expect(ingredientSlug('Graveyard Dirt', 'earth', null)).toBe('graveyard-dirt-earth');
    expect(ingredientSlug('Moon Water', null, null)).toBe('moon-water');
    expect(ingredientSlug('Moon Water', undefined, undefined)).toBe('moon-water');
    expect(ingredientSlug('Testwort', null, 'Fixtura testalis')).toBe('testwort-fixtura-testalis');
  });

  it('is exactly slugify of the three, so the form and the formal name change it as the label does', () => {
    expect(ingredientSlug('Valerian', 'root', 'Valeriana officinalis')).toBe(
      slugify('Valerian root Valeriana officinalis'),
    );
    expect(ingredientSlug('Valerian', 'leaf', 'Valeriana officinalis')).not.toBe(
      ingredientSlug('Valerian', 'root', 'Valeriana officinalis'),
    );
    expect(ingredientSlug("Cat's Claw", 'bark', 'Uncaria guianensis')).not.toBe(
      ingredientSlug("Cat's Claw", 'bark', 'Uncaria tomentosa'),
    );
  });

  // What the slug indexes still refuse (ingredients-indexes.test.ts): two
  // identities `canonical_key` keeps apart and this rule folds together.
  it('folds punctuation and accents in a formal name, as it does in a label', () => {
    expect(ingredientSlug('Testwort', 'herb', 'Fixtura-testalis')).toBe(
      ingredientSlug('Testwort', 'herb', 'Fixtura testalis'),
    );
    expect(ingredientSlug('Hidcote Lavender', 'flower', "Lavandula angustifolia 'Hidcote'")).toBe(
      ingredientSlug('Hidcote Lavender', 'flower', 'Lavandula angustifolia Hidcote'),
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

  it('is exactly slugify of the two, so either moves it', () => {
    expect(formSlug('Testleaf', 'Fixture Group')).toBe(slugify('Testleaf Fixture Group'));
    expect(formSlug('Testleaf', 'Fixture Group')).not.toBe(formSlug('Testroot', 'Fixture Group'));
    expect(formSlug('Testleaf', 'Fixture Group')).not.toBe(formSlug('Testleaf', 'Fixture Other'));
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

  it('is exactly slugify of the two, so either moves it', () => {
    expect(deitySlug('Testra', 'Fixture Folk')).toBe(slugify('Testra Fixture Folk'));
    expect(deitySlug('Testra', 'Fixture Folk')).not.toBe(deitySlug('Mockra', 'Fixture Folk'));
    expect(deitySlug('Testra', 'Fixture Folk')).not.toBe(deitySlug('Testra', 'Fixture Lore'));
  });
});
