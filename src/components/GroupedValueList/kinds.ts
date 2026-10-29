import type { GroupedValueKind } from '../GroupedValueForm/types';
import type { GroupedValueListKind } from './types';

// Each curated vocabulary's address, title and nouns, all that tell its list from another's. The flat
// kinds have no group, so no group column or select. A sign is a "zodiac sign" everywhere, so no label
// leans on the heading.
export const KINDS: Record<GroupedValueKind, GroupedValueListKind> = {
  category: {
    path: '/admin/categories',
    title: 'Categories',
    label: 'Category',
    noun: 'category',
    plural: 'categories',
    group: { label: 'Group', plural: 'Groups', param: 'group' },
  },
  form: {
    path: '/admin/forms',
    title: 'Forms',
    label: 'Form',
    noun: 'form',
    plural: 'forms',
    group: { label: 'Group', plural: 'Groups', param: 'group' },
  },
  deity: {
    path: '/admin/deities',
    title: 'Deities',
    label: 'Deity',
    noun: 'deity',
    plural: 'deities',
    group: { label: 'Tradition', plural: 'Traditions', param: 'tradition' },
  },
  celestialBody: {
    path: '/admin/celestial-bodies',
    title: 'Celestial Bodies',
    label: 'Celestial Body',
    noun: 'celestial body',
    plural: 'celestial bodies',
  },
  zodiacSign: {
    path: '/admin/zodiac-signs',
    title: 'Zodiac Signs',
    label: 'Zodiac Sign',
    noun: 'zodiac sign',
    plural: 'zodiac signs',
  },
};
