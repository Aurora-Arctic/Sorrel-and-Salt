import { describe, expect, it } from 'vitest';
import { DeityInput } from '@/modules/vocabulary/validation/deity';

// A curated deity as an admin writes one (MB.132): `ingredient_forms`' shape,
// its tradition in place of a form's group (claude-docs/db/deity-vocabulary.md).

const TRADITION_ID = '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21';

const VALID = { name: 'Testra', description: 'Invented.', traditionId: TRADITION_ID };

describe('DeityInput', () => {
  it('takes a name, a description and a tradition, trimmed', () => {
    expect(
      DeityInput.parse({ name: ' Testra ', description: ' Invented. ', traditionId: TRADITION_ID }),
    ).toEqual(VALID);
  });

  // The slug is derived from the name (src/lib/slugify.ts), never written
  // beside it; a deity's rename moves no compendium entry's address, so it
  // has no redirect to confirm ending.
  it('drops a slug and an `endRedirect` rather than taking them', () => {
    expect(DeityInput.parse({ ...VALID, slug: 'something-else', endRedirect: true })).toEqual(
      VALID,
    );
  });

  it.each([
    ['name', 'Give the deity a name'],
    ['description', 'Describe the deity'],
  ])('requires a non-blank %s', (field, message) => {
    for (const value of ['  ', undefined]) {
      const result = DeityInput.safeParse({ ...VALID, [field]: value });
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field], message })]);
    }
  });

  it('requires the tradition as an id', () => {
    for (const traditionId of [undefined, 'greek']) {
      const result = DeityInput.safeParse({ ...VALID, traditionId });
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ['traditionId'], message: 'Choose a tradition' }),
      ]);
    }
  });
});
