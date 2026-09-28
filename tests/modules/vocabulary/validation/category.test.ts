import { describe, expect, it } from 'vitest';
import { CategoryInput } from '@/modules/vocabulary/validation/category';

const GROUP_ID = '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21';

function failedPaths(input: unknown) {
  const result = CategoryInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('CategoryInput', () => {
  it('takes a name, a description and a group, trimmed', () => {
    expect(
      CategoryInput.parse({
        name: ' Fixture Ward ',
        description: ' Invented. ',
        groupId: GROUP_ID,
      }),
    ).toEqual({ name: 'Fixture Ward', description: 'Invented.', groupId: GROUP_ID });
  });

  // The slug is derived from the name (src/lib/slugify.ts), never written
  // beside it, so a slug in the input is dropped rather than trusted.
  it('drops a slug rather than taking one', () => {
    const parsed = CategoryInput.parse({
      name: 'Fixture Ward',
      description: 'Invented.',
      groupId: GROUP_ID,
      slug: 'something-else',
    });

    expect(parsed).not.toHaveProperty('slug');
  });

  it.each(['name', 'description'])('requires a non-blank %s', (field) => {
    const input = { name: 'Fixture Ward', description: 'Invented.', groupId: GROUP_ID };

    expect(failedPaths({ ...input, [field]: '  ' })).toEqual([[field]]);
    expect(failedPaths({ ...input, [field]: undefined })).toEqual([[field]]);
  });

  it('requires the group as an id', () => {
    expect(failedPaths({ name: 'Fixture Ward', description: 'Invented.' })).toEqual([['groupId']]);
    expect(
      failedPaths({ name: 'Fixture Ward', description: 'Invented.', groupId: 'protection' }),
    ).toEqual([['groupId']]);
  });
});
