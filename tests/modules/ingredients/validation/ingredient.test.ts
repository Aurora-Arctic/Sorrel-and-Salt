import { describe, expect, it } from 'vitest';
import { nomenclatureKind, ingredientElement } from '@/modules/ingredients/schema/ingredients';
import {
  CompendiumIngredientInput,
  LocalIngredientInput,
} from '@/modules/ingredients/validation/ingredient';
import { PLANETS, ZODIAC_SIGNS } from '@/db/seed/astrology';

// DESIGN.md §5 transcribed rather than imported, so the schemas are compared
// against the spec, not against the constants they are built from.
const NAMING_KINDS = ['botanical', 'fungal', 'zoological', 'mineral', 'chemical'] as const;
const NAMELESS_KINDS = ['unknown', 'none'] as const;
const ELEMENTS = ['earth', 'air', 'fire', 'water', 'spirit'];
const VARIANTS = [
  ['local', LocalIngredientInput],
  ['compendium', CompendiumIngredientInput],
] as const;

/** The paths a failed parse reported, which is what lands beside a field. */
function failedPaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('the workspace-local ingredient', () => {
  it('validates a stub with only a name, supplying nomenclature: none', () => {
    const result = LocalIngredientInput.safeParse({ name: 'Testwort' });

    expect(result.success).toBe(true);
    expect(result.data?.nomenclature).toBe('none');
  });

  it('supplies none for a formal name the form sent back as null', () => {
    expect(LocalIngredientInput.parse({ name: 'Testwort', canonicalName: null }).nomenclature).toBe(
      'none',
    );
  });

  it('supplies none for a formal name the form sent back blank', () => {
    expect(LocalIngredientInput.parse({ name: 'Testwort', canonicalName: '  ' })).toMatchObject({
      nomenclature: 'none',
      canonicalName: null,
    });
  });

  it('keeps a kind the member chose rather than overwriting it', () => {
    expect(LocalIngredientInput.parse({ name: 'Testwort', nomenclature: 'unknown' })).toMatchObject(
      { nomenclature: 'unknown' },
    );
  });

  // Defaulting to `none` here would contradict the name it was given, and
  // guessing `botanical` is the silent guess §5 forbids; so it asks.
  it('asks for the naming system when a formal name arrives without one', () => {
    const result = LocalIngredientInput.safeParse({
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
    });

    expect(failedPaths(result)).toEqual([['nomenclature']]);
  });

  it('requires a name', () => {
    expect(failedPaths(LocalIngredientInput.safeParse({}))).toEqual([['name']]);
    expect(failedPaths(LocalIngredientInput.safeParse({ name: '   ' }))).toEqual([['name']]);
  });
});

describe('the compendium ingredient', () => {
  it('requires nomenclature to be answered, not supplied', () => {
    const result = CompendiumIngredientInput.safeParse({ name: 'Testwort' });

    expect(failedPaths(result)).toEqual([['nomenclature']]);
  });

  it('accepts each answer, none and unknown included', () => {
    for (const kind of NAMELESS_KINDS) {
      expect(
        CompendiumIngredientInput.safeParse({ name: 'Testwort', nomenclature: kind }).success,
      ).toBe(true);
    }
    for (const kind of NAMING_KINDS) {
      const input = { name: 'Testwort', nomenclature: kind, canonicalName: 'Fixtura testalis' };
      expect(CompendiumIngredientInput.safeParse(input).success).toBe(true);
    }
  });
});

describe.each(VARIANTS)('the %s ingredient', (_, Schema) => {
  describe('couples nomenclature to canonicalName, as the database CHECK does', () => {
    it.each(NAMELESS_KINDS)('refuses a formal name on %s', (kind) => {
      const result = Schema.safeParse({
        name: 'Testwort',
        nomenclature: kind,
        canonicalName: 'Fixtura testalis',
      });

      expect(failedPaths(result)).toEqual([['canonicalName']]);
    });

    it.each(NAMING_KINDS)('requires a formal name on %s', (kind) => {
      expect(failedPaths(Schema.safeParse({ name: 'Testwort', nomenclature: kind }))).toEqual([
        ['canonicalName'],
      ]);
      const named = { name: 'Testwort', nomenclature: kind, canonicalName: 'Fixtura testalis' };
      expect(Schema.safeParse(named).success).toBe(true);
    });
  });

  describe('canonicalName and form', () => {
    // A form sends an untouched field as ''; that is an absence, not a value
    // to refuse, so it becomes null — which is also what the database CHECKs
    // on canonical_name and form accept.
    it.each(['canonicalName', 'form'])('treats a blank %s as absent', (field) => {
      const base = { name: 'Testwort', nomenclature: 'none' };

      for (const blank of ['', '   ', '\t\n']) {
        expect(Schema.parse({ ...base, [field]: blank })).toMatchObject({ [field]: null });
      }
    });

    it('trims both', () => {
      const parsed = Schema.parse({
        name: 'Testwort',
        nomenclature: 'botanical',
        canonicalName: '  Fixtura testalis ',
        form: ' root ',
      });

      expect(parsed).toMatchObject({ canonicalName: 'Fixtura testalis', form: 'root' });
    });

    // A binomial regex would refuse every one of these (§5, "No format regex").
    it.each([
      'Artemisia spp.',
      "Lavandula angustifolia 'Hidcote'",
      'Salvia officinalis L.',
      'Quartz var. amethyst',
      'Sodium chloride',
    ])('takes %s as a formal name, with no format regex', (canonicalName) => {
      const kind = canonicalName === 'Sodium chloride' ? 'chemical' : 'botanical';
      expect(
        Schema.safeParse({ name: 'Testwort', nomenclature: kind, canonicalName }).success,
      ).toBe(true);
    });

    // `rhizome` is not in the curated vocabulary: it is an autofill, not a
    // constraint, and a member writes an uncurated value before an admin does.
    it.each(['rhizome', 'Root Bark', 'powder (fine)', 'rootbark'])(
      'takes form %s, curated or not',
      (form) => {
        expect(Schema.safeParse({ name: 'Testwort', nomenclature: 'none', form }).success).toBe(
          true,
        );
      },
    );

    it('leaves both optional', () => {
      expect(Schema.safeParse({ name: 'Testwort', nomenclature: 'none' }).success).toBe(true);
      expect(
        Schema.safeParse({
          name: 'Testwort',
          nomenclature: 'none',
          form: null,
          canonicalName: null,
        }).success,
      ).toBe(true);
    });
  });

  describe('folk names', () => {
    it('refuses a name that is also one of its own folk names, whatever the case', () => {
      const result = Schema.safeParse({
        name: 'Testwort',
        nomenclature: 'none',
        folkNames: ['Fixture Bane', '  testWORT '],
      });

      expect(failedPaths(result)).toEqual([['name']]);
    });

    it('takes folk names that differ from the name', () => {
      const parsed = Schema.parse({
        name: 'Testwort',
        nomenclature: 'none',
        folkNames: [' Fixture Bane ', 'Mock Root'],
      });

      expect(parsed.folkNames).toEqual(['Fixture Bane', 'Mock Root']);
    });

    // The per-ingredient unique index on lower(name) would refuse the second
    // copy; saying so here keeps the index from being what a user sees.
    it('refuses the same folk name twice, pathed to the repeat', () => {
      const result = Schema.safeParse({
        name: 'Testwort',
        nomenclature: 'none',
        folkNames: ['Fixture Bane', 'Mock Root', 'fixture bane'],
      });

      expect(failedPaths(result)).toEqual([['folkNames', 2]]);
    });

    it('drops a blank folk name', () => {
      const parsed = Schema.parse({
        name: 'Testwort',
        nomenclature: 'none',
        folkNames: ['Fixture Bane', ' ', ''],
      });

      expect(parsed.folkNames).toEqual(['Fixture Bane']);
    });

    // The path is what the form puts the message beside, so it must count
    // the rows the form sent, blank ones included.
    it('reports a repeat at the row the form sent it in, blanks included', () => {
      const result = Schema.safeParse({
        name: 'Testwort',
        nomenclature: 'none',
        folkNames: ['Fixture Bane', '', 'fixture bane'],
      });

      expect(failedPaths(result)).toEqual([['folkNames', 2]]);
    });
  });

  describe('enum fields', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };

    it('matches the database enums exactly', () => {
      // The schema and the pgEnum are built from one list; this pins the list
      // to §5 so a change to it is a change to the spec.
      expect([...nomenclatureKind.enumValues]).toEqual([...NAMING_KINDS, ...NAMELESS_KINDS]);
      expect([...ingredientElement.enumValues]).toEqual(ELEMENTS);
    });

    it('element accepts every documented value', () => {
      for (const element of ELEMENTS) {
        expect(Schema.safeParse({ ...base, element }).success).toBe(true);
      }
    });

    it.each([
      ['nomenclature', 'taxonomic'],
      ['element', 'aether'],
      ['element', 'Earth'],
    ])('%s rejects %s', (field, value) => {
      expect(failedPaths(Schema.safeParse({ ...base, [field]: value }))).toContainEqual([field]);
    });
  });

  // Suggested, not enforced: practices differ on both, so a value off the
  // autofill list is written as readily as one on it.
  describe.each([
    ['planet', PLANETS.map((row) => row.name), ['sedna', 'Eris', 'Black Moon Lilith']],
    ['zodiac', ZODIAC_SIGNS.map((row) => row.name), ['Serpentarius', 'the Pleiades']],
  ])('%s', (field, suggestions, unlisted) => {
    it('takes every suggestion, and values off the list', () => {
      for (const value of [...suggestions, ...unlisted]) {
        expect(
          Schema.safeParse({ name: 'Testwort', nomenclature: 'none', [field]: value }).success,
        ).toBe(true);
      }
    });

    it('trims, and treats a blank as absent', () => {
      const base = { name: 'Testwort', nomenclature: 'none' };

      expect(Schema.parse({ ...base, [field]: '  Ceres ' })).toMatchObject({ [field]: 'Ceres' });
      expect(Schema.parse({ ...base, [field]: '  ' })).toMatchObject({ [field]: null });
    });
  });

  it('takes every correspondence at once', () => {
    const parsed = Schema.parse({
      name: 'Testwort',
      nomenclature: 'botanical',
      canonicalName: 'Fixtura testalis',
      form: 'root',
      description: 'An invented herb.',
      element: 'water',
      planet: 'moon',
      zodiac: 'cancer',
      deities: [' Testara '],
      color: 'green',
      safetyNotes: 'Not for internal use.',
      substitutes: ['Mock Root'],
      folkNames: ['Fixture Bane'],
    });

    expect(parsed).toMatchObject({ deities: ['Testara'], planet: 'moon', zodiac: 'cancer' });
  });

  it('drops a blank entry from the other array fields', () => {
    const parsed = Schema.parse({
      name: 'Testwort',
      nomenclature: 'none',
      deities: [''],
      substitutes: ['Mock Root', '  '],
    });

    expect(parsed).toMatchObject({ deities: [], substitutes: ['Mock Root'] });
  });
});
