import { describe, expect, it } from 'vitest';
import {
  CompendiumIngredientInput,
  LocalIngredientInput,
} from '@/modules/ingredients/validation/ingredient';
import { PLANETS } from '@/db/seed/astrology';

// The two variants share every field and `crossFieldRules`, and differ in
// how `nomenclature` is reached: the shared fields run once, on the local
// variant, and the compendium's own describe proves the rules are attached to
// it too (src/modules/ingredients/validation/ingredient.ts).
const ELEMENTS = ['earth', 'air', 'fire', 'water', 'spirit'];

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

  it('supplies none for a formal name sent back null or blank, and a naming system sent null', () => {
    expect(LocalIngredientInput.parse({ name: 'Testwort', canonicalName: null }).nomenclature).toBe(
      'none',
    );
    expect(LocalIngredientInput.parse({ name: 'Testwort', canonicalName: '  ' })).toMatchObject({
      nomenclature: 'none',
      canonicalName: null,
    });
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
  it('reads a formal name with no naming system, absent or null, as unknown', () => {
    for (const nomenclature of [undefined, null]) {
      expect(
        LocalIngredientInput.parse({
          name: 'Testwort',
          canonicalName: 'Fixtura testalis',
          nomenclature,
        }),
      ).toMatchObject({ nomenclature: 'unknown', canonicalName: 'Fixtura testalis' });
    }
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

  // `none` and `unknown` are answers, not absences (CLAUDE.md, Domain invariants).
  it('accepts none and unknown as answers, and a naming kind with its formal name', () => {
    for (const kind of ['none', 'unknown']) {
      expect(
        CompendiumIngredientInput.safeParse({ name: 'Testwort', nomenclature: kind }).success,
      ).toBe(true);
    }
    const input = { name: 'Testwort', nomenclature: 'mineral', canonicalName: 'Fixturite' };
    expect(CompendiumIngredientInput.safeParse(input).success).toBe(true);
  });

  // The one row proving `crossFieldRules` is attached to this variant too.
  it('refuses a formal name on none, at the formal name', () => {
    const result = CompendiumIngredientInput.safeParse({
      name: 'Testwort',
      nomenclature: 'none',
      canonicalName: 'Fixtura testalis',
    });

    expect(failedPaths(result)).toEqual([['canonicalName']]);
  });
});

describe('the ingredient fields, on the local variant', () => {
  const Schema = LocalIngredientInput;

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

    it('requires a formal name on a naming kind', () => {
      expect(
        failedPaths(Schema.safeParse({ name: 'Testwort', nomenclature: 'botanical' })),
      ).toEqual([['canonicalName']]);
      const named = {
        name: 'Testwort',
        nomenclature: 'botanical',
        canonicalName: 'Fixtura testalis',
      };
      expect(Schema.safeParse(named).success).toBe(true);
    });
  });

  describe('canonicalName and form', () => {
    // A binomial regex would refuse this (§5, "No format regex").
    it('takes a formal name with no format regex', () => {
      expect(
        Schema.safeParse({
          name: 'Testwort',
          nomenclature: 'botanical',
          canonicalName: "Fixtura testalis 'Hidcote' L.",
        }).success,
      ).toBe(true);
    });

    // The curated vocabulary is an autofill, not a constraint: a member writes
    // an uncurated value before an admin does.
    it('takes a form the curated vocabulary does not hold', () => {
      expect(
        Schema.safeParse({ name: 'Testwort', nomenclature: 'none', form: 'rhizome' }).success,
      ).toBe(true);
    });
  });

  describe('folk names', () => {
    // Once, at the name, however often it is listed: not again as a repeat.
    it('refuses a name that is also one of its own folk names, whatever the case', () => {
      const result = Schema.safeParse({
        name: 'Testwort',
        nomenclature: 'none',
        folkNames: ['Fixture Bane', '  testWORT ', 'Testwort'],
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

    it('refuses an entry that links and names, does neither, names a blank or links a non-id, at the entry', () => {
      for (const entry of [
        { ingredientId: LINKED, name: 'Mock Root' },
        {},
        { name: '  ' },
        { ingredientId: 'mock-root' },
      ]) {
        const result = Schema.safeParse({ ...base, substitutes: [{ name: 'Mock Root' }, entry] });

        expect(failedPaths(result), JSON.stringify(entry)).toEqual([['substitutes', 1]]);
      }
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

  // DESIGN.md §7: each entry an existing reference's id, with an optional
  // locator, and an ingredient cites each reference once.
  describe('references', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const SIMEK = '00000000-0000-4000-8000-0000000000b1';
    const SMITH = '00000000-0000-4000-8000-0000000000b2';
    const GRIMM = '00000000-0000-4000-8000-0000000000b3';

    it('takes references with and without a locator, a blank one as none', () => {
      const parsed = Schema.parse({
        ...base,
        references: [
          { referenceId: SIMEK, locator: ' p. 112 ' },
          { referenceId: SMITH, locator: '  ' },
          { referenceId: ` ${GRIMM} ` },
        ],
      });

      expect(parsed.references).toEqual([
        { referenceId: SIMEK, locator: 'p. 112' },
        { referenceId: SMITH, locator: null },
        { referenceId: GRIMM, locator: null },
      ]);
    });

    // MB.154: one locator holds every place a source is cited at, tidied and
    // with its ranges dashed, as the form shows it once the box is left.
    it('tidies a locator and dashes its ranges, keeping several places in one', () => {
      const parsed = Schema.parse({
        ...base,
        references: [{ referenceId: SIMEK, locator: ' pp. 12-19,  40;  chap. 3 ' }],
      });

      expect(parsed.references).toEqual([
        { referenceId: SIMEK, locator: 'pp. 12–19, 40; chap. 3' },
      ]);
    });

    it('refuses an entry naming no reference, or a non-id, at the entry', () => {
      for (const entry of [{ referenceId: '  ' }, { referenceId: 'simek-1993' }]) {
        const result = Schema.safeParse({ ...base, references: [{ referenceId: SIMEK }, entry] });

        expect(failedPaths(result), entry.referenceId).toEqual([['references', 1]]);
      }
    });

    // `reference_links_ingredient_unique` would refuse the second copy;
    // saying so here keeps its 23505 from being what a user sees.
    it('refuses the same reference twice, whatever its locator, pathed to the repeat', () => {
      const result = Schema.safeParse({
        ...base,
        references: [
          { referenceId: SIMEK, locator: 'p. 112' },
          { referenceId: SMITH },
          { referenceId: SIMEK, locator: 'p. 40' },
        ],
      });

      expect(failedPaths(result)).toEqual([['references', 2]]);
    });

    it('takes no references, absent or empty', () => {
      expect(Schema.parse(base).references ?? []).toEqual([]);
      expect(Schema.parse({ ...base, references: [] }).references ?? []).toEqual([]);
    });
  });

  // MB.125: the categories an ingredient is filed under, by id. Whether an id
  // names a live category is the service's, which reads the database.
  describe('categoryIds', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const PROTECTION = '00000000-0000-4000-8000-0000000000c1';
    const CLEANSING = '00000000-0000-4000-8000-0000000000c2';

    it('takes the ids picked, trimmed, in the order sent', () => {
      expect(
        Schema.parse({ ...base, categoryIds: [CLEANSING, ` ${PROTECTION} `] }).categoryIds,
      ).toEqual([CLEANSING, PROTECTION]);
    });

    // A chip toggled twice is one category: the service writes it once, so
    // the parse keeps the repeat at its index rather than refusing it.
    it('keeps a repeated id rather than refusing it', () => {
      expect(Schema.safeParse({ ...base, categoryIds: [PROTECTION, PROTECTION] }).success).toBe(
        true,
      );
    });

    it('refuses a blank entry, or a non-id, at the entry', () => {
      for (const entry of ['  ', 'protection']) {
        const result = Schema.safeParse({ ...base, categoryIds: [PROTECTION, entry] });

        expect(failedPaths(result), entry).toEqual([['categoryIds', 1]]);
      }
    });

    it('takes no categories, absent or empty', () => {
      expect(Schema.parse(base).categoryIds ?? []).toEqual([]);
      expect(Schema.parse({ ...base, categoryIds: [] }).categoryIds ?? []).toEqual([]);
    });
  });

  describe('enum fields', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };

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

    it('refuses a value outside the five at its position', () => {
      for (const value of ['aether', 'Earth', '']) {
        expect(
          failedPaths(Schema.safeParse({ ...base, elements: ['fire', value] })),
          value,
        ).toEqual([['elements', 1]]);
      }
    });

    it('refuses a single value sent where the list belongs', () => {
      expect(failedPaths(Schema.safeParse({ ...base, elements: 'fire' }))).toEqual([['elements']]);
    });

    it('refuses a repeat at the repeat', () => {
      const result = Schema.safeParse({ ...base, elements: ['fire', 'air', 'fire'] });

      expect(failedPaths(result)).toEqual([['elements', 2]]);
    });

    it('takes a list left empty, null or absent as absent', () => {
      expect(Schema.parse({ ...base, elements: [] })).toMatchObject({ elements: null });
      expect(Schema.parse({ ...base, elements: null })).toMatchObject({ elements: null });
      expect(Schema.parse(base).elements ?? null).toBeNull();
    });
  });

  // Suggested, not enforced: practices differ on both, so a value off the
  // autofill list is written as readily as one on it.
  // DESIGN.md §5 (MB.134): planets, zodiac signs and colours are one list
  // builder, so it runs once, on the planets.
  describe('planets', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const field = 'planets';

    it('takes every suggestion, and values off the list, in one list', () => {
      const values = [...PLANETS.map((row) => row.name), 'sedna', 'Eris', 'Black Moon Lilith'];

      expect(Schema.parse({ ...base, [field]: values })).toMatchObject({ [field]: values });
    });

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
    });

    it('takes a list left with no entries as absent', () => {
      expect(Schema.parse({ ...base, [field]: [] })).toMatchObject({ [field]: null });
      expect(Schema.parse({ ...base, [field]: [' '] })).toMatchObject({ [field]: null });
    });
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

    it('refuses an entry that links and names, does neither, names a blank or links a non-id, at the entry', () => {
      for (const entry of [
        { deityId: GREEK, name: 'Hecate' },
        {},
        { name: '  ' },
        { deityId: 'hecate' },
      ]) {
        const result = Schema.safeParse({ ...base, deities: [{ name: 'Testara' }, entry] });

        expect(failedPaths(result), JSON.stringify(entry)).toEqual([['deities', 1]]);
      }
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
