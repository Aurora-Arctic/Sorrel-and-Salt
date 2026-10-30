import { describe, expect, it } from 'vitest';
import { MAX_QUANTITY } from '@/modules/ingredients/schema/quantities';
import { UNITS } from '@/modules/ingredients/schema/units';
import { spellStatus, spellVisibility } from '@/modules/grimoire/schema/spells';
import { SpellInput, UpdateSpellInput } from '@/modules/grimoire/validation/spell';
import { SpellStepInput } from '@/modules/grimoire/validation/spell-step';

// The schema mirrors spell_steps' CHECKs so the database is never what a user
// sees refuse a step; each CHECK has a row here, named by its constraint.

const INGREDIENT = '11111111-1111-4111-8111-111111111111';
const VARIANT = '22222222-2222-4222-8222-222222222222';

function failedPaths(input: unknown) {
  const result = SpellStepInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('SpellStepInput', () => {
  it('takes an instruction alone', () => {
    expect(SpellStepInput.parse({ body: ' Grind the leaves ' })).toMatchObject({
      body: 'Grind the leaves',
    });
  });

  it('takes a linked ingredient alone, with its form', () => {
    expect(SpellStepInput.safeParse({ ingredientId: INGREDIENT, variantId: VARIANT }).success).toBe(
      true,
    );
  });

  it('takes a typed name alone, with or without a form', () => {
    expect(SpellStepInput.safeParse({ name: 'Testwort' }).success).toBe(true);
    expect(SpellStepInput.safeParse({ name: 'Testwort', form: 'dried' }).success).toBe(true);
  });

  it('takes an instruction beside an identity, with an amount', () => {
    const input = {
      body: 'Layer it first',
      name: 'Testwort',
      quantity: 2.5,
      unit: 'g',
    };
    expect(SpellStepInput.parse(input)).toMatchObject(input);
  });

  // The step note is retired: `body` is the one text (pr1308-step-note-retired.md).
  it('drops a note an old client still sends', () => {
    expect(SpellStepInput.parse({ body: 'Stir', note: 'old' })).toEqual({ body: 'Stir' });
  });

  // spell_steps_not_empty
  it('refuses a step with neither an instruction nor an identity', () => {
    expect(SpellStepInput.safeParse({}).success).toBe(false);
    expect(SpellStepInput.safeParse({ quantity: 1 }).success).toBe(false);
  });

  // spell_steps_one_identity
  it('refuses both identities', () => {
    expect(
      failedPaths({ ingredientId: INGREDIENT, variantId: VARIANT, name: 'Testwort' }),
    ).toContainEqual(['name']);
  });

  // spell_steps_amount_on_ingredient
  it.each([
    ['quantity', { quantity: 1 }],
    ['unit', { unit: 'g' }],
  ])('refuses %s on an instruction-only step', (field, extra) => {
    expect(failedPaths({ body: 'Stir', ...extra })).toEqual([[field]]);
  });

  it('takes null for the amount on an instruction-only step', () => {
    expect(SpellStepInput.safeParse({ body: 'Stir', quantity: null, unit: null }).success).toBe(
      true,
    );
  });

  // spell_steps_form_only_on_custom
  it('refuses form beside ingredientId', () => {
    expect(failedPaths({ ingredientId: INGREDIENT, variantId: VARIANT, form: 'dried' })).toEqual([
      ['form'],
    ]);
  });

  // spell_steps_variant_with_ingredient
  it('refuses a linked ingredient with no form, and a form id beside a name', () => {
    expect(failedPaths({ ingredientId: INGREDIENT })).toEqual([['variantId']]);
    expect(failedPaths({ name: 'Testwort', variantId: VARIANT })).toEqual([['variantId']]);
    expect(failedPaths({ body: 'Stir', variantId: VARIANT })).toEqual([['variantId']]);
  });

  it('refuses ids that are not ids', () => {
    expect(failedPaths({ ingredientId: 'nope', variantId: VARIANT })).toContainEqual([
      'ingredientId',
    ]);
  });

  // spell_steps_body_not_blank / name_not_blank / form_not_blank
  it('refuses a blank instruction, name or form', () => {
    expect(failedPaths({ body: '   ' })).toContainEqual(['body']);
    expect(failedPaths({ body: 'Stir', name: ' ' })).toEqual([['name']]);
    expect(failedPaths({ name: 'Testwort', form: ' ' })).toEqual([['form']]);
  });

  it('refuses a blank instruction even beside an identity', () => {
    expect(failedPaths({ body: '', name: 'Testwort' })).toEqual([['body']]);
  });

  it('refuses a negative, oversized or non-numeric quantity, at its field', () => {
    for (const quantity of [-1, MAX_QUANTITY + 1, '3', Number.NaN]) {
      expect(failedPaths({ name: 'Testwort', quantity }), String(quantity)).toEqual([['quantity']]);
    }
    expect(SpellStepInput.safeParse({ name: 'Testwort', quantity: 0 }).success).toBe(true);
  });

  it('takes every unit the units module lists, and refuses any other', () => {
    for (const unit of UNITS) {
      expect(SpellStepInput.safeParse({ name: 'Testwort', unit }).success, unit).toBe(true);
    }
    expect(failedPaths({ name: 'Testwort', unit: 'furlong' })).toEqual([['unit']]);
  });
});

describe('SpellInput', () => {
  it('needs no title, and steps default to none', () => {
    expect(SpellInput.parse({ title: ' Testwort Jar ' })).toMatchObject({
      title: 'Testwort Jar',
      steps: [],
    });
  });

  // The CHECK: status <> 'complete' OR title IS NOT NULL
  it('takes a draft with no title, blank or missing', () => {
    expect(SpellInput.safeParse({}).success).toBe(true);
    expect(SpellInput.safeParse({ status: 'draft' }).success).toBe(true);
    expect(SpellInput.parse({ status: 'draft', title: '  ' }).title).toBeNull();
  });

  it('refuses a complete spell with no title, at the title', () => {
    for (const title of [undefined, null, '', '   ']) {
      const result = SpellInput.safeParse({ status: 'complete', title });
      expect(
        result.error?.issues.map((issue) => issue.path),
        String(title),
      ).toEqual([['title']]);
      expect(result.error?.issues[0]?.message).toMatch(/title/i);
    }
  });

  it('takes a complete spell with a title', () => {
    expect(SpellInput.parse({ status: 'complete', title: ' T ' }).title).toBe('T');
  });

  it('lists the statuses the column holds, and refuses any other', () => {
    for (const status of spellStatus.enumValues) {
      expect(SpellInput.safeParse({ title: 'T', status }).success, status).toBe(true);
    }
    expect(SpellInput.safeParse({ title: 'T', status: 'archived' }).success).toBe(false);
  });

  it('lists the visibilities the column holds, and refuses any other', () => {
    for (const visibility of spellVisibility.enumValues) {
      expect(SpellInput.safeParse({ title: 'T', visibility }).success, visibility).toBe(true);
    }
    expect(SpellInput.safeParse({ title: 'T', visibility: 'public' }).success).toBe(false);
  });

  it('takes a note, and reads a blank note as none', () => {
    expect(SpellInput.parse({ title: 'T', note: ' keep dry ' }).note).toBe('keep dry');
    expect(SpellInput.parse({ title: 'T', note: ' ' }).note).toBeNull();
  });

  it('keeps steps in the order given', () => {
    const parsed = SpellInput.parse({
      title: 'T',
      steps: [{ body: 'One' }, { name: 'Testwort' }, { body: 'Three' }],
    });
    expect(parsed.steps.map((step) => step.body ?? step.name)).toEqual([
      'One',
      'Testwort',
      'Three',
    ]);
  });

  it('reports a bad step at its index', () => {
    const result = SpellInput.safeParse({ title: 'T', steps: [{ body: 'One' }, {}] });
    expect(result.error?.issues.map((issue) => issue.path.slice(0, 2))).toEqual([['steps', 1]]);
  });
});

describe('UpdateSpellInput', () => {
  it('takes the revision it was loaded at, or null to overwrite', () => {
    expect(UpdateSpellInput.parse({ title: 'T', expectedRevision: 3 }).expectedRevision).toBe(3);
    expect(
      UpdateSpellInput.parse({ title: 'T', expectedRevision: null }).expectedRevision,
    ).toBeNull();
  });

  it('refuses a missing or malformed revision, at its field', () => {
    for (const expectedRevision of [undefined, 0, -1, 1.5, '2']) {
      const result = UpdateSpellInput.safeParse({ title: 'T', expectedRevision });
      expect(
        result.error?.issues.map((issue) => issue.path),
        String(expectedRevision),
      ).toEqual([['expectedRevision']]);
    }
  });

  it('holds the same rules as the create input', () => {
    expect(
      UpdateSpellInput.safeParse({ status: 'complete', expectedRevision: 1 }).error?.issues[0]
        ?.path,
    ).toEqual(['title']);
    expect(
      UpdateSpellInput.safeParse({ title: 'T', expectedRevision: 1, steps: [{}] }).success,
    ).toBe(false);
  });
});

describe('a recipe’s steps, taken together', () => {
  const STEP = '44444444-4444-4444-8444-444444444444';
  const pathsOf = (steps: unknown[]) =>
    SpellInput.safeParse({ steps }).error?.issues.map((issue) => issue.path);

  it('admits one form laid in several steps', () => {
    const linked = { ingredientId: INGREDIENT, variantId: VARIANT };
    expect(pathsOf([linked, { body: 'Stir' }, linked])).toBeUndefined();
  });

  it('refuses one custom name twice, case aside, mirroring spell_steps_spell_id_custom_name_unique', () => {
    expect(pathsOf([{ name: 'Testwort' }, { name: 'Testroot' }])).toBeUndefined();
    expect(pathsOf([{ name: 'Testwort' }, { name: 'TESTWORT', form: 'oil' }])).toEqual([
      ['steps', 1, 'name'],
    ]);
  });

  it('refuses one saved step named twice', () => {
    expect(
      pathsOf([
        { id: STEP, body: 'One' },
        { id: STEP, body: 'Two' },
      ]),
    ).toEqual([['steps', 1, 'id']]);
  });

  it('leaves an update’s recipe unchanged when it names no steps, and empties it when they are []', () => {
    expect(UpdateSpellInput.parse({ expectedRevision: 1 }).steps).toBeUndefined();
    expect(UpdateSpellInput.parse({ expectedRevision: 1, steps: [] }).steps).toEqual([]);
    expect(SpellInput.parse({}).steps).toEqual([]);
  });
});

describe('a spell’s categories', () => {
  const CATEGORY = '33333333-3333-4333-8333-333333333333';

  it('leaves the categories out when the input names none, on create and update alike', () => {
    expect(SpellInput.parse({}).categoryIds).toBeUndefined();
    expect(UpdateSpellInput.parse({ expectedRevision: null }).categoryIds).toBeUndefined();
  });

  it('takes category ids, and an empty list that clears them', () => {
    expect(SpellInput.parse({ categoryIds: [CATEGORY] }).categoryIds).toEqual([CATEGORY]);
    expect(UpdateSpellInput.parse({ expectedRevision: null, categoryIds: [] }).categoryIds).toEqual(
      [],
    );
  });

  it('refuses an id that is not an id, at its index', () => {
    for (const schema of [SpellInput, UpdateSpellInput]) {
      const result = schema.safeParse({
        expectedRevision: null,
        categoryIds: [CATEGORY, 'Protection'],
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => [issue.path, issue.message])).toEqual([
        [['categoryIds', 1], 'No such category'],
      ]);
    }
  });
});
