import { single } from '../../lib/search-params';
import {
  choiceParam,
  defineSearchParams,
  flagParam,
  listParam,
  searchParam,
  slugListParam,
  textListParam,
  textParam,
} from '../../lib/search-param-table';
import {
  type CategoryMode,
  COMPENDIUM_SORTS,
  INGREDIENT_ELEMENTS,
  type ToxicFilter,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { ReviewSetting } from './types';

// The two settings the Toxic strip chooses between. The query's third, `any`,
// is no filter, so it is the address with no `toxic` in it.
const TOXIC_SETTINGS = ['toxic', 'not_toxic'] as const satisfies readonly Exclude<
  ToxicFilter,
  'any'
>[];

export const REVIEW_SETTINGS = ['reviewed', 'needs_review'] as const;

// The compendium search's parameters, each once: address name, how it is read, and the filter variable
// it becomes. A list is a repeated parameter, never comma-joined, as a form's text may hold a comma
// (claude-docs/components/ingredient-search.md, "The parameter table").
export const COMPENDIUM_PARAMS = defineSearchParams({
  query: textParam('query', 'query'),
  // Entries holding any of these forms by their text, `?forms=Oil&forms=Tincture`,
  // which the compendium read folds. Free text, not a fixed set: the form
  // vocabulary is only an autofill, so a form no one has curated is still valid.
  forms: textListParam('forms', 'forms'),
  withoutReferences: flagParam('withoutReferences'),
  // Only the hidden entries, `?hidden=1`; the admin list otherwise shows hidden and shown together.
  // The compendium read takes it as its `listing` and refuses it to anyone but a curator.
  hidden: flagParam('hidden', 'listing', (on) => (on ? ('hidden' as const) : undefined)),
  withoutForms: flagParam('withoutForms'),
  elements: listParam('elements', INGREDIENT_ELEMENTS, 'elements'),
  categories: slugListParam('categories', 'categoryIds', 'categories'),
  // Written only for `any`, `?categoryMode=any`: all is the default, so it
  // leaves the address as it was, and a junk value reads as all.
  categoryMode: searchParam({
    name: 'categoryMode',
    variable: 'categoryMode',
    read: (raw): CategoryMode => (single(raw) === 'any' ? 'any' : 'all'),
    write: (mode: CategoryMode) => (mode === 'any' ? 'any' : undefined),
    toVariable: (mode) => (mode === 'any' ? 'any' : undefined),
  }),
  deities: slugListParam('deities', 'deityIds', 'deities'),
  // Entries listing any of these zodiac signs, `?zodiac=Aries`, by the sign's
  // name, which the compendium read folds. Free text like forms: the sign
  // vocabulary is an autofill, so a name no one has curated is still valid.
  zodiac: textListParam('zodiac', 'zodiacSigns'),
  celestialBodies: textListParam('celestialBodies', 'celestialBodies'),
  toxic: choiceParam('toxic', TOXIC_SETTINGS, 'toxic'),
  // Entries a curator marked reviewed, `?reviewed=1`, or not, `?reviewed=0`
  //. Only the admin list offers it, and the read refuses it without a
  // curator's session, since the mark is the curators' alone.
  reviewed: searchParam({
    name: 'reviewed',
    variable: 'reviewed',
    read: (raw): ReviewSetting | '' => {
      const value = single(raw);
      return value === '1' ? 'reviewed' : value === '0' ? 'needs_review' : '';
    },
    write: (setting: ReviewSetting | '') =>
      setting === 'reviewed' ? '1' : setting === 'needs_review' ? '0' : undefined,
    toVariable: (setting) => (setting === '' ? undefined : setting === 'reviewed'),
  }),
  // The column the admin list sorts on, `?sort=name` or `?sort=sourcing_score`, each in its first direction: A to Z, lowest first.
  // Absent is the default, by name or by best match under a query. The read refuses the sourcing score without a curator's session.
  sort: choiceParam('sort', COMPENDIUM_SORTS, 'sort'),
  // `?order=desc` beside a sort reverses it; absent is the sort's first direction, so a sort's address needs no second parameter.
  order: choiceParam('order', ['desc'] as const, 'order'),
  // Entries held in any of these covens of the viewer's, `?covens=<id>&covens=<id>`. Ids, not slugs, as
  // a shared address should not spell a coven out. Only the public compendium offers it, and the read
  // proves each id by membership, so a coven the viewer is not in filters nothing.
  covens: textListParam('covens', 'covenIds'),
  // Not In: entries none of the picked covens hold, or none of the viewer's covens if none picked.
  covensNot: flagParam('covensNot'),
});
