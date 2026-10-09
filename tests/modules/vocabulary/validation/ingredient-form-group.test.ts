import { describe, expect, it } from 'vitest';
import { IngredientFormGroupInput } from '@/modules/vocabulary/validation/ingredient-form-group';

// A form group as an admin writes one (M5.6b): `category_groups` minus the
// colour pair, since a form group sections a dropdown rather than colouring a
// chip (MB.35).

const VALID = { name: 'Fixture Matter', description: 'Invented.' };

describe('IngredientFormGroupInput', () => {
  it('takes a name and a description, trimmed', () => {
    expect(
      IngredientFormGroupInput.parse({ name: ' Fixture Matter ', description: ' Invented. ' }),
    ).toEqual(VALID);
  });

  it('drops a slug and a colour rather than taking them', () => {
    const parsed = IngredientFormGroupInput.parse({ ...VALID, slug: 'x', colorDark: '#ffffff' });

    expect(parsed).toEqual(VALID);
  });

  it.each([
    ['name', 'Give the group a name'],
    ['description', 'Describe the group'],
  ])('requires a non-blank %s', (field, message) => {
    for (const value of ['  ', undefined]) {
      const result = IngredientFormGroupInput.safeParse({ ...VALID, [field]: value });
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field], message })]);
    }
  });
});
