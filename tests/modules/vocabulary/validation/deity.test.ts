import { describe, expect, it } from 'vitest';
import { DeityInput } from '@/modules/vocabulary/validation/deity';

// What the schema adds over curatedValueInput, whose name, description and
// dropped slug are tests/lib/validation.test.ts's: the tradition in place of a
// form's group (claude-docs/db/deity-vocabulary.md).

function failedPaths(input: unknown) {
  const result = DeityInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('DeityInput', () => {
  it('requires the tradition as an id, at the tradition', () => {
    const input = { name: 'Testra', description: 'Invented.' };

    expect(failedPaths(input)).toEqual([['traditionId']]);
    expect(failedPaths({ ...input, traditionId: 'greek' })).toEqual([['traditionId']]);
  });
});
