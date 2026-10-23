import {
  choiceParam,
  defineSearchParams,
  listParam,
  searchParam,
  slugListParam,
  textListParam,
  textParam,
} from '../../lib/search-param-table';
import { single } from '../../lib/search-params';
import {
  type CategoryMode,
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

// The Reviewed strip's two settings (M14.8). No filter is the address with no
// `reviewed` in it; the address writes them `1` and `0`, and the query
// variable is true or false.
export const REVIEW_SETTINGS = ['reviewed', 'needs_review'] as const;

// The compendium search's parameters, each once (M8.13): the name in the
// address, how it is read, and the filter variable it becomes. The page reads
// its address through `COMPENDIUM_PARAMS.read`, every link and the pager write
// theirs through `.href`, and the filter form's fields name the same
// parameters. A new filter is one more entry here
// (claude-docs/components/ingredient-search.md, "The parameter table").
// Every list is a repeated parameter, never comma-joined: a GET form writes
// repeated names itself, and a form's text may hold a comma.
export const COMPENDIUM_PARAMS = defineSearchParams({
  query: textParam('query', 'query'),
  // Entries holding any of these forms by their text, `?forms=Oil&forms=Tincture`,
  // which the compendium read folds. Free text, not a fixed set: the form
  // vocabulary is only an autofill, so a form no one has curated is still valid.
  forms: textListParam('forms', 'forms'),
  // Written `1`, the value its checkbox submits natively. Only the admin list offers it.
  withoutReferences: searchParam({
    name: 'withoutReferences',
    variable: 'withoutReferences',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
  // Entries with no live form, `?withoutForms=1`, as withoutReferences is written (M12.30).
  // Only the admin list offers it.
  withoutForms: searchParam({
    name: 'withoutForms',
    variable: 'withoutForms',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
  // Entries holding any of these, `?elements=fire&elements=earth`.
  elements: listParam('elements', INGREDIENT_ELEMENTS, 'elements'),
  // Entries filed under all of these categories, or any of them under
  // `categoryMode`: `?categories=protection&categories=cleansing`. Slugs in the
  // address, the ids `categoryIds` takes through the page's `categories` lookup (M8.11).
  categories: slugListParam('categories', 'categoryIds', 'categories'),
  // Written only for `any`, `?categoryMode=any`: all is the default, so it
  // leaves the address as it was, and a junk value reads as all (M8.12).
  categoryMode: searchParam({
    name: 'categoryMode',
    variable: 'categoryMode',
    read: (raw): CategoryMode => (single(raw) === 'any' ? 'any' : 'all'),
    write: (mode: CategoryMode) => (mode === 'any' ? 'any' : undefined),
    toVariable: (mode) => (mode === 'any' ? 'any' : undefined),
  }),
  // Entries linked to any of these deities, `?deities=hecate-greek&deities=hecate-roman`.
  // The address carries a deity's slug (its name and its tradition's), so two
  // gods of one name under two traditions stay apart and the address stays
  // short; the query takes ids, through the page's `deities` lookup (M8.13, M12.4).
  deities: slugListParam('deities', 'deityIds', 'deities'),
  // Entries listing any of these zodiac signs, `?zodiac=Aries`, by the sign's
  // name, which the compendium read folds. Free text like forms: the sign
  // vocabulary is an autofill, so a name no one has curated is still valid.
  zodiac: textListParam('zodiac', 'zodiacSigns'),
  // Entries listing any of these celestial bodies,
  // `?celestialBodies=Sun`, by name, as zodiac is.
  celestialBodies: textListParam('celestialBodies', 'celestialBodies'),
  // Toxic entries, or entries that are not: `?toxic=not_toxic`. Left out for
  // either, so `any` and a junk value read as no filter.
  toxic: choiceParam('toxic', TOXIC_SETTINGS, 'toxic'),
  // Entries a curator marked reviewed, `?reviewed=1`, or not, `?reviewed=0`
  // (M14.8). Only the admin list offers it, and the read refuses it without a
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
});
