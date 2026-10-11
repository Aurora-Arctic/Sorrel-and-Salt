import { describe, expect, it } from 'vitest';
import { CategoryInput } from '@/modules/vocabulary/validation/category';

// What the schema adds over curatedValueInput, whose name, description and
// dropped slug are tests/lib/validation.test.ts's: the group it is filed under.

function failedPaths(input: unknown) {
  const result = CategoryInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('CategoryInput', () => {
  it('requires the group as an id, at the group', () => {
    const input = { name: 'Fixture Ward', description: 'Invented.' };

    expect(failedPaths(input)).toEqual([['groupId']]);
    expect(failedPaths({ ...input, groupId: 'protection' })).toEqual([['groupId']]);
  });
});
