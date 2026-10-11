import { describe, expect, it } from 'vitest';
import { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';

// What the schema adds over curatedValueInput, whose name, description and
// dropped slug are tests/lib/validation.test.ts's: the group, and the admin's
// confirmation that a rename may end another entry's redirect (MB.82).

const GROUP_ID = '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21';

const VALID = { name: 'Fixture Shard', description: 'Invented.', groupId: GROUP_ID };

function failedPaths(input: unknown) {
  const result = IngredientFormValueInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('IngredientFormValueInput', () => {
  it('requires the group as an id, at the group', () => {
    expect(failedPaths({ ...VALID, groupId: undefined })).toEqual([['groupId']]);
    expect(failedPaths({ ...VALID, groupId: 'substance' })).toEqual([['groupId']]);
  });

  it('takes `endRedirect` when given, and only as a boolean', () => {
    expect(IngredientFormValueInput.parse({ ...VALID, endRedirect: true })).toEqual({
      ...VALID,
      endRedirect: true,
    });
    expect(IngredientFormValueInput.parse(VALID)).not.toHaveProperty('endRedirect');
    expect(failedPaths({ ...VALID, endRedirect: 'yes' })).toEqual([['endRedirect']]);
  });
});
