import { describe, expect, it } from 'vitest';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';

// The ingredient form's resolver: what it adds over LocalIngredientInput,
// whose own rules are ingredient.test.ts's. The form's pick is not a field of
// its own: the box that made it is Form's, so the schema's issue with the
// pick, or with its text, lands on `form` (MB.169). A pure function, so
// called here rather than reached through a render of the form.

describe('ingredientResolver', () => {
  it.each([
    { id: 'not-a-uuid', form: 'Wax', issue: 'the pick' },
    { id: '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b', form: '', issue: 'its text' },
  ])(
    'puts an issue with the form’s pick, or with its text, on Form ($issue)',
    async ({ id, form }) => {
      const formLink = { id, name: 'Wax', group: null, description: null };

      const { errors } = await ingredientResolver(
        { ...EMPTY_VALUES, name: 'Testwort', form, formLink },
        undefined,
        { fields: {}, shouldUseNativeValidation: false },
      );

      expect(Object.keys(errors)).toEqual(['form']);
      expect(errors.form?.message).toEqual(expect.any(String));
    },
  );
});
