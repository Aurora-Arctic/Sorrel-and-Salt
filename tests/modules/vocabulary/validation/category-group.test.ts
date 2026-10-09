import { describe, expect, it } from 'vitest';
import { CATEGORY_GROUPS } from '@/db/seed/category-groups';
import { CHIP_GROUNDS, contrastRatio } from '@/lib/contrast';
import { CategoryGroupInput } from '@/modules/vocabulary/validation/category-group';

// A category group as an admin writes one (M5.6b): its colours held to 4.5:1,
// each against the harder of its own theme's surfaces — `colorDark` the dark
// card, `colorLight` the light page (MB.36) — refused beside the picker that
// chose it (MB.43), naming the column and the ratio missed.

const VALID = {
  name: 'Fixture Wards',
  description: 'Invented.',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};

/** The dark page, which MB.36 moved the check off: the card is harder. */
const DARK_PAGE = '#14120e';

function issuesOf(input: unknown) {
  const result = CategoryGroupInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map(({ path, message }) => ({ path, message })) ?? [];
}

describe('CategoryGroupInput', () => {
  it('takes a name, a description and two colours, trimmed', () => {
    expect(
      CategoryGroupInput.parse({ ...VALID, name: ' Fixture Wards ', description: ' Invented. ' }),
    ).toEqual(VALID);
  });

  it('stores a colour lower-cased, however it was typed', () => {
    expect(CategoryGroupInput.parse({ ...VALID, colorDark: '#4E8BC2' }).colorDark).toBe('#4e8bc2');
  });

  // The slug is derived from the name (src/lib/slugify.ts), never written beside it.
  it('drops a slug rather than taking one', () => {
    expect(CategoryGroupInput.parse({ ...VALID, slug: 'elsewhere' })).not.toHaveProperty('slug');
  });

  it.each([
    ['name', 'Give the group a name'],
    ['description', 'Describe the group'],
  ])('requires a non-blank %s', (field, message) => {
    for (const value of ['  ', undefined]) {
      expect(issuesOf({ ...VALID, [field]: value })).toEqual([{ path: [field], message }]);
    }
  });

  it.each(['colorDark', 'colorLight'])('requires %s as a six-digit hex', (column) => {
    for (const value of [undefined, '', 'blue', '#abc', '4e8bc2', '#4e8bc2ff', '#gggggg']) {
      expect(issuesOf({ ...VALID, [column]: value })).toEqual([
        { path: [column], message: 'Choose a colour, as a hex like #4e8bc2' },
      ]);
    }
  });

  // The owner's call: the pair is one family, as every seeded pair is.
  describe('the one hue', () => {
    it('refuses a pair whose hues are more than 10° apart, beside the light-theme colour', () => {
      expect(issuesOf({ ...VALID, colorLight: '#930c31' })).toEqual([
        {
          path: ['colorLight'],
          message: 'The two colours are 135° apart in hue — keep them within 10° of each other',
        },
      ]);
    });

    it('takes a pair a few degrees apart', () => {
      expect(CategoryGroupInput.safeParse({ ...VALID, colorLight: '#0c4d93' }).success).toBe(true);
    });

    it('takes two greys, which have no hue to disagree on', () => {
      expect(
        CategoryGroupInput.safeParse({ ...VALID, colorDark: '#8a8a8a', colorLight: '#5f5f5f' })
          .success,
      ).toBe(true);
    });

    it('refuses a grey beside a colour', () => {
      expect(issuesOf({ ...VALID, colorDark: '#8a8a8a' })).toEqual([
        {
          path: ['colorLight'],
          message: 'One colour is grey and the other is not — give them the same hue',
        },
      ]);
    });

    // A floor already missed is the refusal to fix first; the hue waits for it.
    it('says nothing of the hue while a colour is under the floor', () => {
      expect(issuesOf({ ...VALID, colorDark: '#930c31' })).toEqual([
        expect.objectContaining({ path: ['colorDark'] }),
      ]);
    });
  });

  describe('the contrast floor', () => {
    // A hex fit for the light page is far too dark for the dark card.
    it('refuses a dark-theme colour under 4.5:1 on the dark card, naming the column and the ratio', () => {
      expect(contrastRatio('#0c5393', CHIP_GROUNDS.light)).toBeGreaterThan(4.5);

      expect(issuesOf({ ...VALID, colorDark: '#0c5393' })).toEqual([
        {
          path: ['colorDark'],
          message: 'The dark theme colour reads 2.16:1 on the dark card — it needs at least 4.5:1',
        },
      ]);
    });

    it('refuses a light-theme colour under 4.5:1 on the light page, naming the column and the ratio', () => {
      expect(contrastRatio('#4e8bc2', CHIP_GROUNDS.dark)).toBeGreaterThan(4.5);

      expect(issuesOf({ ...VALID, colorLight: '#4e8bc2' })).toEqual([
        {
          path: ['colorLight'],
          message:
            'The light theme colour reads 2.99:1 on the light page — it needs at least 4.5:1',
        },
      ]);
    });

    // MB.36: clearing the dark page is not enough, since a chip sits on cards too.
    it('refuses a dark-theme colour that clears the dark page but not the dark card', () => {
      expect(contrastRatio('#7f7f7f', DARK_PAGE)).toBeGreaterThanOrEqual(4.5);

      expect(issuesOf({ ...VALID, colorDark: '#7f7f7f' })).toEqual([
        {
          path: ['colorDark'],
          message: 'The dark theme colour reads 4.24:1 on the dark card — it needs at least 4.5:1',
        },
      ]);
    });

    it('refuses both columns at once, each beside its own picker', () => {
      expect(issuesOf({ ...VALID, colorDark: '#0c5393', colorLight: '#4e8bc2' })).toEqual([
        expect.objectContaining({ path: ['colorDark'] }),
        expect.objectContaining({ path: ['colorLight'] }),
      ]);
    });

    // A ratio shown as 4.50 must never be the one refused: it is cut, not rounded.
    it('never shows a refused ratio rounded up to the floor', () => {
      const [{ message }] = issuesOf({ ...VALID, colorDark: '#07938c' });

      expect(contrastRatio('#07938c', CHIP_GROUNDS.dark)).toBeGreaterThan(4.495);
      expect(contrastRatio('#07938c', CHIP_GROUNDS.dark)).toBeLessThan(4.5);
      expect(message).not.toContain('4.50:1');
    });

    // So editing a seeded group never trips the check (MB.36).
    it.each(CATEGORY_GROUPS.map((group) => [group.name, group] as const))(
      'accepts the seeded pair of %s',
      (_name, { name, description, colorDark, colorLight }) => {
        expect(
          CategoryGroupInput.safeParse({ name, description, colorDark, colorLight }).success,
        ).toBe(true);
      },
    );
  });
});
