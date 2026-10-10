import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';

const GROUP_ID = '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21';

const VALID = { name: 'Fixture Shard', description: 'Invented.', groupId: GROUP_ID };

// The seed writes its ids by hand, as RFC 4122 versions and variants do not
// (src/db/seed/standard.ts): RowId takes one, where z.uuid() refused it (MB.209).
const FIXTURE_ID = '00000000-0000-0000-0000-000000000003';

function failedPaths(input: unknown) {
  const result = IngredientFormValueInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('IngredientFormValueInput', () => {
  it('takes a name, a description and a group, trimmed', () => {
    expect(
      IngredientFormValueInput.parse({
        name: ' Fixture Shard ',
        description: ' Invented. ',
        groupId: GROUP_ID,
      }),
    ).toEqual(VALID);
  });

  // The slug is derived from the name and the group (src/lib/slugify.ts),
  // never written beside them, so a slug in the input is dropped.
  it('drops a slug rather than taking one', () => {
    const parsed = IngredientFormValueInput.parse({ ...VALID, slug: 'something-else' });

    expect(parsed).not.toHaveProperty('slug');
  });

  // The admin's confirmation that a rename may end another entry's redirect (MB.82).
  it('takes `endRedirect` when given, and only as a boolean', () => {
    expect(IngredientFormValueInput.parse({ ...VALID, endRedirect: true })).toEqual({
      ...VALID,
      endRedirect: true,
    });
    expect(IngredientFormValueInput.parse(VALID)).not.toHaveProperty('endRedirect');
    expect(failedPaths({ ...VALID, endRedirect: 'yes' })).toEqual([['endRedirect']]);
  });

  it.each([
    ['name', 'Give the form a name'],
    ['description', 'Describe the form'],
  ])('requires a non-blank %s', (field, message) => {
    for (const value of ['  ', undefined]) {
      const result = IngredientFormValueInput.safeParse({ ...VALID, [field]: value });
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field], message })]);
    }
  });

  it('requires the group as an id', () => {
    expect(failedPaths({ name: 'Fixture Shard', description: 'Invented.' })).toEqual([['groupId']]);
    const result = IngredientFormValueInput.safeParse({ ...VALID, groupId: 'substance' });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['groupId'], message: 'Choose a group' }),
    ]);
  });

  it('takes a hand-written fixture id as the group', () => {
    // The precondition: the id is not an RFC uuid, so z.uuid() would refuse it.
    expect(z.uuid().safeParse(FIXTURE_ID).success).toBe(false);

    expect(IngredientFormValueInput.parse({ ...VALID, groupId: FIXTURE_ID }).groupId).toBe(
      FIXTURE_ID,
    );
  });
});
