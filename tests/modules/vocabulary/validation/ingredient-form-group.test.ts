import { describe, expect, it } from 'vitest';
import { FORM_GROUP_ICONS } from '@/modules/vocabulary/schema/form-group-icons';
import { IngredientFormGroupInput } from '@/modules/vocabulary/validation/ingredient-form-group';

// What the schema adds over curatedValueInput, whose name, description and
// dropped slug are tests/lib/validation.test.ts's: the icon standing for the
// group, one of the six or none, which is the generic.

const VALID = { name: 'Fixture Matter', description: 'Invented.' };

describe('IngredientFormGroupInput', () => {
  it('takes each of the six icons, and null, as given', () => {
    for (const icon of [...FORM_GROUP_ICONS, null]) {
      expect(IngredientFormGroupInput.parse({ ...VALID, icon }).icon, String(icon)).toBe(icon);
    }
  });

  it('takes a group with no icon at all', () => {
    expect(IngredientFormGroupInput.parse(VALID)).toEqual(VALID);
  });

  it('refuses any other value, at the icon', () => {
    for (const icon of ['banana', 'Botanical', '', 3]) {
      const result = IngredientFormGroupInput.safeParse({ ...VALID, icon });

      expect(result.success, String(icon)).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([['icon']]);
    }
  });
});
