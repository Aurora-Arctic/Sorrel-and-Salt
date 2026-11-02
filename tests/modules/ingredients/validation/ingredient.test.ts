import { describe, expect, it } from 'vitest';
import {
  CompendiumIngredientInput,
  LocalIngredientInput,
} from '@/modules/ingredients/validation/ingredient';
import { CELESTIAL_BODIES } from '@/db/seed/astrology';

// The two variants share every field and `crossFieldRules`, and differ in how `nomenclature` is reached.
// The shared fields run once, on the local variant, and the compendium's own describe proves the rules are attached to it too (src/modules/ingredients/validation/ingredient.ts).
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
  // system.
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

  describe('canonicalName', () => {
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
        { ingredientId: LINKED, substituteVariantId: null, name: null },
        { ingredientId: null, substituteVariantId: null, name: 'Mock Root' },
      ]);
    });

    // A link may name one form of the ingredient it links. Whether
    // the form is that ingredient's reads the database, so it is the service's.
    it('takes a link naming one of its forms, and refuses a form that is not an id or has no link, beside it', () => {
      const parsed = Schema.parse({
        ...base,
        substitutes: [{ ingredientId: LINKED, substituteVariantId: OTHER }],
      });
      expect(parsed.substitutes).toEqual([
        { ingredientId: LINKED, substituteVariantId: OTHER, name: null },
      ]);

      for (const entry of [
        { ingredientId: LINKED, substituteVariantId: 'oil' },
        { name: 'Mock Root', substituteVariantId: OTHER },
      ]) {
        const result = Schema.safeParse({ ...base, substitutes: [entry] });

        expect(failedPaths(result), JSON.stringify(entry)).toEqual([
          ['substitutes', 0, 'substituteVariantId'],
        ]);
      }
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
  });

  // DESIGN.md §7: each entry an existing reference's id, with an optional
  // locator, and an ingredient cites each reference once.
  describe('references', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const SIMEK = '00000000-0000-4000-8000-0000000000b1';
    const SMITH = '00000000-0000-4000-8000-0000000000b2';
    const GRIMM = '00000000-0000-4000-8000-0000000000b3';
    // A coven's citation carries neither compendium attribute.
    const NO_ATTRIBUTES = { nameBasis: null, supports: null };

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
        { referenceId: SIMEK, locator: 'p. 112', ...NO_ATTRIBUTES },
        { referenceId: SMITH, locator: null, ...NO_ATTRIBUTES },
        { referenceId: GRIMM, locator: null, ...NO_ATTRIBUTES },
      ]);
    });

    // One locator holds every place a source is cited at, tidied and
    // with its ranges dashed, as the form shows it once the box is left.
    it('tidies a locator and dashes its ranges, keeping several places in one', () => {
      const parsed = Schema.parse({
        ...base,
        references: [{ referenceId: SIMEK, locator: ' pp. 12-19,  40;  chap. 3 ' }],
      });

      expect(parsed.references).toEqual([
        { referenceId: SIMEK, locator: 'pp. 12–19, 40; chap. 3', ...NO_ATTRIBUTES },
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
  });

  // The categories an ingredient is filed under, by id. Whether an id
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
  });

  describe('enum fields', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };

    it('nomenclature rejects a value outside the enum', () => {
      expect(failedPaths(Schema.safeParse({ ...base, nomenclature: 'taxonomic' }))).toEqual([
        ['nomenclature'],
      ]);
    });
  });

  // DESIGN.md §5: a list of the five, in the order chosen, each once.
  describe('elements', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };

    it('accepts every documented value, all at once', () => {
      expect(Schema.parse({ ...base, elements: ELEMENTS })).toMatchObject({ elements: ELEMENTS });
    });

    it('refuses a value outside the five at its position', () => {
      for (const value of ['aether', 'Earth', '']) {
        expect(
          failedPaths(Schema.safeParse({ ...base, elements: ['fire', value] })),
          value,
        ).toEqual([['elements', 1]]);
      }
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

  // Suggested, not enforced: practices differ, so a value off the autofill list is written as readily as one on it.
  // DESIGN.md §5: celestial bodies, zodiac signs and colours are one list builder, so it runs once, on the celestial bodies.
  describe('celestialBodies', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const field = 'celestialBodies';

    it('takes every suggestion, and values off the list, in one list', () => {
      const values = [
        ...CELESTIAL_BODIES.map((row) => row.name),
        'sedna',
        'Eris',
        'Black Moon Lilith',
      ];

      expect(Schema.parse({ ...base, [field]: values })).toMatchObject({ [field]: values });
    });

    it('trims each entry and drops a blank one', () => {
      expect(Schema.parse({ ...base, [field]: ['  Ceres ', '  ', 'Vesta'] })).toMatchObject({
        [field]: ['Ceres', 'Vesta'],
      });
    });

    // As folk names are, case-folded and trimmed, at the row the form
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
      description: 'An invented herb.',
      elements: ['water', 'earth'],
      celestialBodies: ['moon', 'Venus'],
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
      celestialBodies: ['moon', 'Venus'],
      zodiacSigns: ['cancer'],
      colors: ['green', 'silver'],
    });
  });

  // Each deity links a curated row or names one (DESIGN.md §5,
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
  });

  // The forms an ingredient comes in, each a list entry with its own fields, substitutes, references and categories.
  // A rule a variant shares with the ingredient runs on one row here, pathed beneath the variant; whether a form's pick, link or category names a live row is the service's.
  describe('variants', () => {
    const base = { name: 'Testwort', nomenclature: 'none' };
    const KEPT = '00000000-0000-4000-8000-0000000000b1';
    const LINKED = '00000000-0000-4000-8000-0000000000b2';
    /** One whole form, as the input type requires every field but its id. */
    const formOf = (form: string, fields: Record<string, unknown> = {}) => ({
      form,
      formId: '',
      description: '',
      safetyNotes: '',
      toxic: false,
      elements: [],
      celestialBodies: [],
      zodiacSigns: [],
      colors: [],
      categoryIds: [],
      substitutes: [],
      references: [],
      ...fields,
    });

    it('takes each form with its fields and lists, dropping blank list entries', () => {
      const parsed = Schema.parse({
        ...base,
        variants: [
          formOf(' Dried leaf ', {
            id: KEPT,
            description: ' Pressed. ',
            celestialBodies: ['Venus', ' '],
          }),
          formOf('Testoil', {
            elements: ['fire'],
            categoryIds: [LINKED],
            substitutes: [{ ingredientId: LINKED, substituteVariantId: KEPT }],
            references: [{ referenceId: LINKED, locator: ' p. 3 ' }],
          }),
        ],
      });

      expect(parsed.variants).toMatchObject([
        { id: KEPT, form: 'Dried leaf', description: 'Pressed.', celestialBodies: ['Venus'] },
        {
          form: 'Testoil',
          elements: ['fire'],
          categoryIds: [LINKED],
          substitutes: [{ ingredientId: LINKED, substituteVariantId: KEPT, name: null }],
          references: [{ referenceId: LINKED, locator: 'p. 3' }],
        },
      ]);
    });

    it('requires a form, blank or left out, beside it', () => {
      const { form: _left, ...formless } = formOf('Herb');

      expect(
        failedPaths(
          Schema.safeParse({ ...base, variants: [formOf('Herb'), formOf(' '), formless] }),
        ),
      ).toEqual([
        ['variants', 1, 'form'],
        ['variants', 2, 'form'],
      ]);
    });

    // Each entry replaces the row it names, so a field left out would clear it.
    it('refuses a form leaving a field out, beside the field', () => {
      const { description: _left, ...short } = formOf('Herb');

      expect(failedPaths(Schema.safeParse({ ...base, variants: [short] }))).toEqual([
        ['variants', 0, 'description'],
      ]);
    });

    // `ingredient_variants_form_unique` would refuse the second; saying so
    // here keeps its 23505 from being what a user sees.
    it('refuses two forms folding alike, at the repeat', () => {
      const result = Schema.safeParse({
        ...base,
        variants: [formOf('Herb'), formOf('Oil'), formOf(' herb ')],
      });

      expect(failedPaths(result)).toEqual([['variants', 2, 'form']]);
    });

    it('refuses an id that is not one, or one sent twice, beside it', () => {
      expect(
        failedPaths(Schema.safeParse({ ...base, variants: [formOf('Herb', { id: 'herb' })] })),
      ).toEqual([['variants', 0, 'id']]);
      expect(
        failedPaths(
          Schema.safeParse({
            ...base,
            variants: [formOf('Herb', { id: KEPT }), formOf('Oil', { id: KEPT })],
          }),
        ),
      ).toEqual([['variants', 1, 'id']]);
    });

    it('refuses a pick that is not an id, beside it', () => {
      expect(
        failedPaths(Schema.safeParse({ ...base, variants: [formOf('Herb', { formId: 'herb' })] })),
      ).toEqual([['variants', 0, 'formId']]);
    });

    // A form stands in for a form, so a variant's
    // link names one; the ingredient's own list may still link it whole.
    it('refuses a variant’s link naming no form, beside its form, which the ingredient’s own list takes', () => {
      const whole = { substitutes: [{ ingredientId: LINKED }] };

      expect(Schema.safeParse({ ...base, ...whole }).success).toBe(true);
      expect(
        failedPaths(
          Schema.safeParse({ ...base, variants: [formOf('Herb'), formOf('Oil', whole)] }),
        ),
      ).toEqual([['variants', 1, 'substitutes', 0, 'substituteVariantId']]);
    });

    // One row each for the ingredient's own rules, run on the variant's lists.
    it.each([
      [
        'a repeated celestial body',
        { celestialBodies: ['Venus', 'venus'] },
        ['celestialBodies', 1],
      ],
      ['a repeated element', { elements: ['fire', 'fire'] }, ['elements', 1]],
      ['a substitute neither linked nor named', { substitutes: [{}] }, ['substitutes', 0]],
      [
        'a substitute form with no link',
        { substitutes: [{ name: 'Mock Root', substituteVariantId: KEPT }] },
        ['substitutes', 0, 'substituteVariantId'],
      ],
      [
        'a reference cited twice',
        { references: [{ referenceId: LINKED }, { referenceId: LINKED }] },
        ['references', 1],
      ],
      ['a category that is not an id', { categoryIds: ['herb'] }, ['categoryIds', 0]],
    ])('refuses %s, pathed beneath the variant', (_case, fields, path) => {
      const result = Schema.safeParse({
        ...base,
        variants: [formOf('Herb'), formOf('Oil', fields)],
      });

      expect(failedPaths(result)).toEqual([['variants', 1, ...path]]);
    });
  });
});
