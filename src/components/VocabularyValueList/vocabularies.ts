import type { Route } from 'next';
import type { FlatVocabulary, VocabularyCopy } from './types';

// Each flat vocabulary's address and nouns, which are all that tell its page,
// its list and its form from the other's (MB.95). The sign is "sign" wherever
// the page already says zodiac, as its heading does.
export const VOCABULARY_COPY: Record<FlatVocabulary, VocabularyCopy> = {
  planets: {
    path: '/admin/planets' as Route,
    title: 'Planets',
    noun: 'planet',
    plural: 'planets',
    label: 'Planet',
  },
  zodiacSigns: {
    path: '/admin/zodiac-signs' as Route,
    title: 'Zodiac Signs',
    noun: 'sign',
    plural: 'signs',
    label: 'Sign',
  },
};
