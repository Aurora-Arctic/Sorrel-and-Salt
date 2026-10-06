import type { SeedCategoryGroup } from './types';

// §6's eight groups and their colour pairs, apart from the seed that writes
// them so the workshop can render them: this file imports nothing at runtime,
// where categories.ts reaches the database (claude-docs/workshop.md, ".ladle/").

/**
 * Each group's name mapped to its key in M0.7's `$category-groups` Sass map —
 * keyed by name because the slug is derived. The two vocabularies meet here
 * and nowhere else.
 */
export const SASS_TOKEN_BY_GROUP_NAME: Record<string, string> = {
  'Protection & Defense': 'protection',
  'Cleansing & Release': 'cleansing',
  'Prosperity & Work': 'prosperity',
  'Love & Connection': 'love',
  'Mind & Spirit': 'mind',
  Wellbeing: 'wellbeing',
  'Craft & Change': 'craft',
  'Practice & Place': 'practice',
};

/**
 * The eight groups in §6's order, each carrying the hex pair M0.7's
 * `category-group-color($slug, $theme)` resolves to. Written out rather than
 * computed because an admin owns the colour once seeded; categories.test.ts
 * compares all sixteen against the Sass function.
 */
export const CATEGORY_GROUPS: SeedCategoryGroup[] = [
  {
    name: 'Protection & Defense',
    colorDark: '#4e8bc2',
    colorLight: '#0c5393',
    description:
      'Work that keeps something out or sends it back — shields set in advance, and the undoing of harm already done.',
  },
  {
    name: 'Cleansing & Release',
    colorDark: '#35987d',
    colorLight: '#097255',
    description:
      'Work that clears what has gathered — washing a place, a person or a habit clean, and letting the rest go.',
  },
  {
    name: 'Prosperity & Work',
    colorDark: '#7b9132',
    colorLight: '#576d09',
    description:
      'Work aimed at livelihood — money, trade and standing, and the rulings and risks that move them.',
  },
  {
    name: 'Love & Connection',
    colorDark: '#cb6883',
    colorLight: '#930c31',
    description:
      'Work on the bonds between people — drawing them close, mending them, and keeping them steady.',
  },
  {
    name: 'Mind & Spirit',
    colorDark: '#8e7bd1',
    colorLight: '#2b0c93',
    description:
      'Work on perception and thought — seeing further, remembering better, and telling true from false.',
  },
  {
    name: 'Wellbeing',
    colorDark: '#379835',
    colorLight: '#0d770a',
    description: 'Work on the body and its ease — mending, resting, and the nerve to keep going.',
  },
  {
    name: 'Craft & Change',
    colorDark: '#c45dc7',
    colorLight: '#8f0c93',
    description:
      'Work on the shape of things — steadying yourself first, then making, altering and bringing about.',
  },
  {
    name: 'Practice & Place',
    colorDark: '#b7783f',
    colorLight: '#934c0c',
    description:
      'Work rooted in a household and its dead — the hearth, the road, and the company kept on both.',
  },
];
