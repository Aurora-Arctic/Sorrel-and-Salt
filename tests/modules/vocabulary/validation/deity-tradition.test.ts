import { describe, expect, it } from 'vitest';
import { DeityTraditionInput } from '@/modules/vocabulary/validation/deity-tradition';

// A deity tradition as an admin writes one (MB.132): `ingredient_form_groups`'
// shape, a people or a religion that labels a suggestion rather than
// colouring a chip, so no colour pair (claude-docs/db/deity-vocabulary.md).

const VALID = { name: 'Fixtural', description: 'Invented.' };

describe('DeityTraditionInput', () => {
  it('takes a name and a description, trimmed', () => {
    expect(DeityTraditionInput.parse({ name: ' Fixtural ', description: ' Invented. ' })).toEqual(
      VALID,
    );
  });

  it('drops a slug and a colour rather than taking them', () => {
    expect(DeityTraditionInput.parse({ ...VALID, slug: 'x', colorDark: '#ffffff' })).toEqual(VALID);
  });

  it.each([
    ['name', 'Give the tradition a name'],
    ['description', 'Describe the tradition'],
  ])('requires a non-blank %s', (field, message) => {
    for (const value of ['  ', undefined]) {
      const result = DeityTraditionInput.safeParse({ ...VALID, [field]: value });
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field], message })]);
    }
  });
});
