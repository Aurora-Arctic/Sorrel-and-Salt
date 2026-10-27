import { describe, expect, it } from 'vitest';
import type { IngredientFormValues, VariantFormValues } from '@/components/IngredientForm/types';
import {
  EMPTY_VALUES,
  EMPTY_VARIANT,
  compendiumResolver,
  fieldNameOf,
  ingredientResolver,
} from '@/components/IngredientForm/values';

// The ingredient form's resolver: what it adds over LocalIngredientInput,
// whose own rules are
// tests/modules/ingredients/validation/ingredient.test.ts's. A variant's
// pick is not a field of its own: the box that made it is its Form's, so
// the schema's issue with the pick, or with its text, lands on that
// variant's `form` (MB.169, MB.221). And the one mapping from an issue's
// path to a field, which the server's issues go through. Pure functions,
// so called here rather than reached through a render of the form.

const OPTIONS = { fields: {}, shouldUseNativeValidation: false };
const SOURCE_ID = '9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
/** The source a reference row links, as the form holds it. */
const SOURCE_LINK = { id: SOURCE_ID, isGlobal: true, kind: 'book', title: 'A Herbal' } as const;

/** Testwort, coming in one form, `variant`. */
const withVariant = (variant: Partial<VariantFormValues>): IngredientFormValues => ({
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'none',
  variants: [{ ...EMPTY_VARIANT, form: 'Wax', ...variant }],
});

/** The error at `path` among the resolver's errors, or undefined. */
const at = (errors: object, path: readonly (string | number)[]) =>
  path.reduce<unknown>(
    (node, key) => (node as Record<string | number, unknown> | undefined)?.[key],
    errors,
  );

describe('ingredientResolver', () => {
  it.each([
    { id: 'not-a-uuid', form: 'Wax', issue: 'the pick' },
    { id: '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b', form: '', issue: 'its text' },
  ])(
    'puts an issue with a variant’s pick, or with its text, on its Form ($issue)',
    async ({ id, form }) => {
      const formLink = { id, name: 'Wax', group: null, icon: null, description: null };

      const { errors } = await ingredientResolver(
        withVariant({ form, formLink }),
        undefined,
        OPTIONS,
      );

      expect(Object.keys(errors)).toEqual(['variants']);
      expect(Object.keys(errors.variants?.[0] ?? {})).toEqual(['form']);
      expect(errors.variants?.[0]?.form?.message).toEqual(expect.any(String));
    },
  );

  it('moves a variant’s repeated list entry onto that entry’s value', async () => {
    const { errors } = await ingredientResolver(
      withVariant({ celestialBodies: [{ value: 'Mars' }, { value: 'mars' }] }),
      undefined,
      OPTIONS,
    );

    expect(at(errors, ['variants', 0, 'celestialBodies', 1, 'value'])).toMatchObject({
      message: expect.any(String),
    });
    expect(at(errors, ['variants', 0, 'celestialBodies', 0])).toBeUndefined();
  });

  it.each([
    {
      issue: 'a repeated reference',
      variant: {
        references: [
          { value: 'A Herbal', link: SOURCE_LINK, locator: '' },
          { value: 'A Herbal', link: SOURCE_LINK, locator: 'p. 2' },
        ],
      },
      path: ['variants', 0, 'references', 1, 'value'],
    },
    {
      issue: 'a substitute’s form that names nothing',
      variant: {
        substitutes: [
          {
            value: 'Mockwort',
            link: {
              id: SOURCE_ID,
              canonicalName: null,
              forms: [],
              description: null,
              isGlobal: true,
            },
            variantId: 'not-a-uuid',
          },
        ],
      },
      path: ['variants', 0, 'substitutes', 0, 'value'],
    },
  ])('moves $issue onto the variant’s row for it', async ({ variant, path }) => {
    const { errors } = await ingredientResolver(withVariant(variant), undefined, OPTIONS);

    expect(at(errors, path)).toMatchObject({ message: expect.any(String) });
  });

  it.each([
    {
      box: 'the New Form box',
      values: { ...withVariant({}), drafts: { ...EMPTY_VALUES.drafts, variants: 'Oil' } },
      path: ['drafts', 'variants'],
    },
    {
      box: 'a variant’s list box',
      values: withVariant({ drafts: { ...EMPTY_VARIANT.drafts, colors: 'Amber' } }),
      path: ['variants', 0, 'drafts', 'colors'],
    },
  ])('holds a save while $box still holds text', async ({ values, path }) => {
    const { errors } = await ingredientResolver(values, undefined, OPTIONS);

    expect(at(errors, path)).toMatchObject({ type: 'unadded' });
  });
});

describe('compendiumResolver', () => {
  it('refuses a variant’s form typed rather than picked, on its Form', async () => {
    const { errors } = await compendiumResolver(
      withVariant({ form: 'Oyl', formLink: null }),
      undefined,
      OPTIONS,
    );

    expect(at(errors, ['variants', 0, 'form'])).toMatchObject({ type: 'unpicked' });
  });

  it('holds a save while the New Form box holds text, as a pick not made', async () => {
    const { errors } = await compendiumResolver(
      { ...withVariant({}), drafts: { ...EMPTY_VALUES.drafts, variants: 'Oyl' } },
      undefined,
      OPTIONS,
    );

    expect(at(errors, ['drafts', 'variants'])).toMatchObject({ type: 'unpicked' });
  });
});

describe('fieldNameOf', () => {
  const values: IngredientFormValues = {
    ...EMPTY_VALUES,
    variants: [
      {
        ...EMPTY_VARIANT,
        form: 'Wax',
        celestialBodies: [{ value: 'Mars' }],
        substitutes: [{ value: 'Mockwort' }],
        references: [{ value: 'A Herbal', link: SOURCE_LINK, locator: '' }],
      },
      { ...EMPTY_VARIANT, form: 'Oil' },
    ],
  };

  it.each([
    { path: ['variants', 1, 'form'], field: 'variants.1.form' },
    { path: ['variants', 1, 'formId'], field: 'variants.1.form' },
    { path: ['variants', 1, 'id'], field: 'variants.1.form' },
    { path: ['variants', 1], field: 'variants.1.form' },
    { path: ['variants', 0, 'celestialBodies', 0], field: 'variants.0.celestialBodies.0.value' },
    { path: ['variants', 0, 'celestialBodies', 1], field: undefined },
    {
      path: ['variants', 0, 'substitutes', 0, 'substituteVariantId'],
      field: 'variants.0.substitutes.0.value',
    },
    { path: ['variants', 0, 'references', 0, 'locator'], field: 'variants.0.references.0.locator' },
    { path: ['variants', 2, 'form'], field: undefined },
  ])('places $path on $field', ({ path, field }) => {
    expect(fieldNameOf(path, values)).toBe(field);
  });
});
