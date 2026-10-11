import type { Route } from 'next';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import type { GroupedValueListKind } from './types';

// Each curated vocabulary's address, title and nouns, which are all that tell
// its list from another's: a new kind is an entry here (MB.132). The flat
// kinds, the planets and the signs (MB.95), have no group, so their list has
// no group column and their filter no group select. A sign is a "zodiac
// sign" everywhere, its buttons included (the MB.115 sign-off), so no label
// leans on the heading to say which kind of sign.
export const KINDS: Record<GroupedValueKind, GroupedValueListKind> = {
  category: {
    path: '/admin/categories' as Route,
    title: 'Categories',
    label: 'Category',
    noun: 'category',
    plural: 'categories',
    group: { label: 'Group', plural: 'Groups', param: 'group' },
  },
  form: {
    path: '/admin/forms' as Route,
    title: 'Forms',
    label: 'Form',
    noun: 'form',
    plural: 'forms',
    group: { label: 'Group', plural: 'Groups', param: 'group' },
  },
  deity: {
    path: '/admin/deities' as Route,
    title: 'Deities',
    label: 'Deity',
    noun: 'deity',
    plural: 'deities',
    group: { label: 'Tradition', plural: 'Traditions', param: 'tradition' },
  },
  planet: {
    path: '/admin/planets' as Route,
    title: 'Planets',
    label: 'Planet',
    noun: 'planet',
    plural: 'planets',
  },
  zodiacSign: {
    path: '/admin/zodiac-signs' as Route,
    title: 'Zodiac Signs',
    label: 'Zodiac Sign',
    noun: 'zodiac sign',
    plural: 'zodiac signs',
  },
};
