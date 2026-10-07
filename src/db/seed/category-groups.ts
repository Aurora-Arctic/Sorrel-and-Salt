import type { SeedCategoryGroup } from './types';

// §6's eight groups and their colour pairs, apart from the seed that writes
// them so the workshop can render them: this file imports nothing at runtime,
// where categories.ts reaches the database (claude-docs/workshop.md, ".ladle/").

/**
 * The eight groups in §6's order, each with its hex pair. These are the owner's
 * hand-tuned pairs, and this file is their only source. M0.7's Sass formula,
 * which gave every group one saturation per theme, could not hold them
 * (claude-docs/styling.md, "Category-group colours"). categories.test.ts holds
 * each pair to the contrast floor, to one hue, and to its step of the rotation.
 */
export const CATEGORY_GROUPS: SeedCategoryGroup[] = [
  {
    name: 'Protection & Defense',
    colorDark: '#5d8ab1',
    colorLight: '#286ba6',
    description:
      'Work that keeps something out or sends it back — shields set in advance, and the undoing of harm already done.',
  },
  {
    name: 'Cleansing & Release',
    colorDark: '#50a58e',
    colorLight: '#1d755d',
    description:
      'Work that clears what has gathered — washing a place, a person or a habit clean, and letting the rest go.',
  },
  {
    name: 'Prosperity & Work',
    colorDark: '#86964a',
    colorLight: '#606c2f',
    description:
      'Work aimed at livelihood — money, trade and standing, and the rulings and risks that move them.',
  },
  {
    name: 'Love & Connection',
    colorDark: '#cf6e87',
    colorLight: '#a44c63',
    description:
      'Work on the bonds between people — drawing them close, mending them, and keeping them steady.',
  },
  {
    name: 'Mind & Spirit',
    colorDark: '#8e7bd1',
    colorLight: '#6e4ce6',
    description:
      'Work on perception and thought — seeing further, remembering better, and telling true from false.',
  },
  {
    name: 'Wellbeing',
    colorDark: '#559c54',
    colorLight: '#326d31',
    description: 'Work on the body and its ease — mending, resting, and the nerve to keep going.',
  },
  {
    name: 'Craft & Change',
    colorDark: '#c371c6',
    colorLight: '#a13ba5',
    description:
      'Work on the shape of things — steadying yourself first, then making, altering and bringing about.',
  },
  {
    name: 'Practice & Place',
    colorDark: '#b7783f',
    colorLight: '#8a5628',
    description:
      'Work rooted in a household and its dead — the hearth, the road, and the company kept on both.',
  },
];
