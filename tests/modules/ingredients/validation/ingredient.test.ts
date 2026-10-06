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
const NON_NAMING_KINDS = ['unknown', 'none'] as const;
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

  it('supplies none for a naming system sent as null, as an absence', () => {
    expect(LocalIngredientInput.parse({ name: 'Testwort', nomenclature: null }).nomenclature).toBe(
      'none',
    );
  });

  it('keeps a kind the member chose rather than overwriting it', () => {
    expect(LocalIngredientInput.parse({ name: 'Testwort', nomenclature: 'unknown' })).toMatchObject(
      { nomenclature: 'unknown' },
    );
  });

  // `none` would contradict the name it was given, and `botanical` is the
  // silent guess §5 forbids; `unknown` admits the name without claiming its
  // system (MB.161).
  it.each([undefined, null])(
    'reads a formal name with the naming system %s as unknown',
    (nomenclature) => {
      expect(
        LocalIngredientInput.parse({
          name: 'Testwort',
          canonicalName: 'Fixtura testalis',
          nomenclature,
        }),
      ).toMatchObject({ nomenclature: 'unknown', canonicalName: 'Fixtura testalis' });
    },
  );

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
    for (const kind of NON_NAMING_KINDS) {
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
    it('refuses a formal name on none', () => {
      const result = Schema.safeParse({
        name: 'Testwort',
        nomenclature: 'none',
        canonicalName: 'Fixtura testalis',
      });

      expect(failedPaths(result)).toEqual([['canonicalName']]);
    });

    // The one kind the rule leaves open: a formal name exists, its system unsettled.
    it('takes unknown with a formal name and without one', () => {
      const base = { name: 'Testwort', nomenclature: 'unknown' };

      expect(Schema.parse({ ...base, canonicalName: 'Fixtura testalis' })).toMatchObject({
        nomenclature: 'unknown',
        canonicalName: 'Fixtura testalis',
      });
      expect(Schema.parse(base)).toMatchObject({ nomenclature: 'unknown' });
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

  // DESIGN.md §5, `ingredient_substitutes`: each entry links an ingredient or
  // names one, and an ingredient lists each once.
  describe('substitutes', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const LINKED = '00000000-0000-4000-8000-0000000000a1';
    const OTHER = '00000000-0000-4000-8000-0000000000a2';

    it('takes links and typed names together, each as exactly one of the two', () => {
      const parsed = Schema.parse({
        ...base,
        substitutes: [{ ingredientId: LINKED }, { name: ' Mock Root ', ingredientId: null }],
      });

      expect(parsed.substitutes).toEqual([
        { ingredientId: LINKED, name: null },
        { ingredientId: null, name: 'Mock Root' },
      ]);
    });

    it.each([
      ['links and names at once', { ingredientId: LINKED, name: 'Mock Root' }],
      ['does neither', {}],
      ['names only a blank', { name: '  ' }],
      ['links an id that is not one', { ingredientId: 'mock-root' }],
    ])('refuses an entry that %s, pathed to the entry', (_case, entry) => {
      const result = Schema.safeParse({
        ...base,
        substitutes: [{ name: 'Mock Root' }, entry],
      });

      expect(failedPaths(result)).toEqual([['substitutes', 1]]);
    });

    // The two partial unique indexes would refuse the second copy; saying so
    // here keeps the index's 23505 from being what a user sees.
    it('refuses the same ingredient linked twice, pathed to the repeat', () => {
      const result = Schema.safeParse({
        ...base,
        substitutes: [{ ingredientId: LINKED }, { ingredientId: OTHER }, { ingredientId: LINKED }],
      });

      expect(failedPaths(result)).toEqual([['substitutes', 2]]);
    });

    it('refuses the same name twice in any case, pathed to the repeat', () => {
      const result = Schema.safeParse({
        ...base,
        substitutes: [{ name: 'Mock Root' }, { ingredientId: LINKED }, { name: ' mock ROOT' }],
      });

      expect(failedPaths(result)).toEqual([['substitutes', 2]]);
    });

    it('takes no substitutes, absent or empty', () => {
      expect(Schema.parse(base).substitutes ?? []).toEqual([]);
      expect(Schema.parse({ ...base, substitutes: [] }).substitutes ?? []).toEqual([]);
    });
  });

  describe('enum fields', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };

    it('matches the database enums exactly', () => {
      // The schema and the pgEnum are built from one list; this pins the list
      // to §5 so a change to it is a change to the spec.
      expect([...nomenclatureKind.enumValues]).toEqual([...NAMING_KINDS, ...NON_NAMING_KINDS]);
      expect([...ingredientElement.enumValues]).toEqual(ELEMENTS);
    });

    it('nomenclature rejects a value outside the enum', () => {
      expect(failedPaths(Schema.safeParse({ ...base, nomenclature: 'taxonomic' }))).toEqual([
        ['nomenclature'],
      ]);
    });
  });

  // DESIGN.md §5 (MB.157): a list of the five, in the order chosen, each once.
  describe('elements', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };

    it('accepts every documented value, all at once', () => {
      expect(Schema.parse({ ...base, elements: ELEMENTS })).toMatchObject({ elements: ELEMENTS });
    });

    it('keeps the order chosen', () => {
      expect(Schema.parse({ ...base, elements: ['water', 'fire', 'air'] })).toMatchObject({
        elements: ['water', 'fire', 'air'],
      });
    });

    it.each(['aether', 'Earth', ''])('refuses %j at its position', (value) => {
      expect(failedPaths(Schema.safeParse({ ...base, elements: ['fire', value] }))).toEqual([
        ['elements', 1],
      ]);
    });

    it('refuses a single value sent where the list belongs', () => {
      expect(failedPaths(Schema.safeParse({ ...base, elements: 'fire' }))).toEqual([['elements']]);
    });

    it('refuses a repeat at the repeat, naming the element', () => {
      const result = Schema.safeParse({ ...base, elements: ['fire', 'air', 'fire'] });

      expect(failedPaths(result)).toEqual([['elements', 2]]);
      expect(result.error?.issues[0]?.message).toBe('Fire is already chosen');
    });

    it('takes a list left empty, null or absent as absent', () => {
      expect(Schema.parse({ ...base, elements: [] })).toMatchObject({ elements: null });
      expect(Schema.parse({ ...base, elements: null })).toMatchObject({ elements: null });
      expect(Schema.parse(base).elements ?? null).toBeNull();
    });

    // The single column is undeclared (MB.159), so a caller still sending
    // one writes nothing through it.
    it('carries no single element', () => {
      expect(Object.keys(Schema.parse({ ...base, element: 'fire' }))).not.toContain('element');
    });
  });

  // Suggested, not enforced: practices differ on both, so a value off the
  // autofill list is written as readily as one on it.
  describe.each([
    ['planets', PLANETS.map((row) => row.name), ['sedna', 'Eris', 'Black Moon Lilith']],
    ['zodiacSigns', ZODIAC_SIGNS.map((row) => row.name), ['Serpentarius', 'the Pleiades']],
  ])('%s', (field, suggestions, unlisted) => {
    it('takes every suggestion, and values off the list, in one list', () => {
      const values = [...suggestions, ...unlisted];

      expect(
        Schema.parse({ name: 'Testwort', nomenclature: 'none', [field]: values }),
      ).toMatchObject({ [field]: values });
    });
  });

  // DESIGN.md §5 (MB.134): the three lists are validated as `deities` is.
  describe.each(['planets', 'zodiacSigns', 'colors'])('%s', (field) => {
    const base = { name: 'Testwort', nomenclature: 'none' };

    it('trims each entry and drops a blank one', () => {
      expect(Schema.parse({ ...base, [field]: ['  Ceres ', '  ', 'Vesta'] })).toMatchObject({
        [field]: ['Ceres', 'Vesta'],
      });
    });

    it('keeps the order entered', () => {
      expect(Schema.parse({ ...base, [field]: ['Vesta', 'Ceres', 'Pallas'] })).toMatchObject({
        [field]: ['Vesta', 'Ceres', 'Pallas'],
      });
    });

    // MB.167: as folk names are, case-folded and trimmed, at the row the form
    // sent it in — blanks counted.
    it('refuses a repeat but for case and spacing, at the repeat', () => {
      const result = Schema.safeParse({ ...base, [field]: ['Vesta', ' ', 'Ceres', ' vESTA '] });

      expect(failedPaths(result)).toEqual([[field, 3]]);
      expect(result.error?.issues[0]?.message).toMatch(/already listed/);
    });

    it('takes a list left with no entries as absent', () => {
      expect(Schema.parse({ ...base, [field]: [] })).toMatchObject({ [field]: null });
      expect(Schema.parse({ ...base, [field]: [' '] })).toMatchObject({ [field]: null });
    });
  });

  // The single columns are gone (MB.136 undeclared them, MB.137 dropped them),
  // so a caller still sending one writes nothing through it.
  it('carries no single planet, zodiac sign or colour', () => {
    const parsed = Schema.parse({
      name: 'Testwort',
      nomenclature: 'none',
      planet: 'Moon',
      zodiac: 'Cancer',
      color: 'Silver',
    });

    expect(Object.keys(parsed)).not.toContain('planet');
    expect(Object.keys(parsed)).not.toContain('zodiac');
    expect(Object.keys(parsed)).not.toContain('color');
  });

  it('takes every correspondence at once', () => {
    const parsed = Schema.parse({
      name: 'Testwort',
      nomenclature: 'botanical',
      canonicalName: 'Fixtura testalis',
      form: 'root',
      description: 'An invented herb.',
      elements: ['water', 'earth'],
      planets: ['moon', 'Venus'],
      zodiacSigns: ['cancer'],
      deities: [{ name: ' Testara ' }],
      colors: ['green', 'silver'],
      safetyNotes: 'Not for internal use.',
      substitutes: [{ name: 'Mock Root' }],
      folkNames: ['Fixture Bane'],
    });

    expect(parsed).toMatchObject({
      elements: ['water', 'earth'],
      deities: [{ deityId: null, name: 'Testara' }],
      planets: ['moon', 'Venus'],
      zodiacSigns: ['cancer'],
      colors: ['green', 'silver'],
    });
  });

  // A list left with no entries is no list: cleared to null, as a blank text
  // field is, so "none" is stored one way rather than as NULL and {}.
  it('takes an array field left empty as absent', () => {
    const parsed = Schema.parse({
      name: 'Testwort',
      nomenclature: 'none',
      colors: ['  '],
      folkNames: [],
    });

    expect(parsed).toMatchObject({ colors: null, folkNames: null });
  });

  // MB.167: the form a member picked, recorded beside its text (DESIGN.md §5,
  // `ingredient_forms`). Whether the id names a curated row is the service's.
  describe('formId', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const PICKED = '00000000-0000-4000-8000-0000000000f1';

    it('takes a picked form beside its text', () => {
      expect(Schema.parse({ ...base, form: 'Wax', formId: PICKED })).toMatchObject({
        form: 'Wax',
        formId: PICKED,
      });
    });

    it('treats a blank id as no pick', () => {
      expect(Schema.parse({ ...base, form: 'Wax', formId: '' })).toMatchObject({ formId: null });
      expect(Schema.parse({ ...base, form: 'Wax' }).formId ?? null).toBeNull();
    });

    it('refuses an id that is not one, beside it', () => {
      expect(failedPaths(Schema.safeParse({ ...base, form: 'Wax', formId: 'wax' }))).toEqual([
        ['formId'],
      ]);
    });

    // `ingredients_form_id_has_form` would refuse it; the text field is where
    // the member sees why.
    it('refuses a pick with no form text, beside the text', () => {
      expect(failedPaths(Schema.safeParse({ ...base, form: ' ', formId: PICKED }))).toEqual([
        ['form'],
      ]);
    });
  });

  // MB.167: each deity links a curated row or names one (DESIGN.md §5,
  // `ingredient_deities`), in the order entered, and an ingredient lists each once.
  describe('deities', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const GREEK = '00000000-0000-4000-8000-0000000000d1';
    const ROMAN = '00000000-0000-4000-8000-0000000000d2';

    it('takes links and typed names together, in the order sent, each as one of the two', () => {
      const parsed = Schema.parse({
        ...base,
        deities: [{ deityId: GREEK }, { name: ' Testara ', deityId: '' }, { deityId: ROMAN }],
      });

      expect(parsed.deities).toEqual([
        { deityId: GREEK, name: null },
        { deityId: null, name: 'Testara' },
        { deityId: ROMAN, name: null },
      ]);
    });

    it.each([
      ['links and names at once', { deityId: GREEK, name: 'Hecate' }],
      ['does neither', {}],
      ['names only a blank', { name: '  ' }],
      ['links an id that is not one', { deityId: 'hecate' }],
    ])('refuses an entry that %s, pathed to the entry', (_case, entry) => {
      const result = Schema.safeParse({ ...base, deities: [{ name: 'Testara' }, entry] });

      expect(failedPaths(result)).toEqual([['deities', 1]]);
    });

    // The two partial unique indexes would refuse the second copy; saying so
    // here keeps the index's 23505 from being what a member sees.
    it('refuses the same deity linked twice, pathed to the repeat', () => {
      const result = Schema.safeParse({
        ...base,
        deities: [{ deityId: GREEK }, { deityId: ROMAN }, { deityId: GREEK }],
      });

      expect(failedPaths(result)).toEqual([['deities', 2]]);
    });

    it('refuses the same typed name twice in any case, pathed to the repeat', () => {
      const result = Schema.safeParse({
        ...base,
        deities: [{ name: 'Testara' }, { deityId: GREEK }, { name: ' tESTARA' }],
      });

      expect(failedPaths(result)).toEqual([['deities', 2]]);
    });

    // Greek and Roman Hecate are two deities; a typed "Hecate" beside a picked
    // one is text beside a link. Whether the names agree is not asked here.
    it('takes two links, and a typed name beside a link, whatever their names', () => {
      expect(
        Schema.safeParse({
          ...base,
          deities: [{ deityId: GREEK }, { deityId: ROMAN }, { name: 'Hecate' }],
        }).success,
      ).toBe(true);
    });

    it('takes no deities, absent or empty, as none', () => {
      expect(Schema.parse(base).deities ?? []).toEqual([]);
      expect(Schema.parse({ ...base, deities: [] }).deities ?? []).toEqual([]);
    });
  });
});
