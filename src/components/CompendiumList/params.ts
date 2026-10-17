import {
  choiceParam,
  defineSearchParams,
  listParam,
  searchParam,
  slugListParam,
  textParam,
} from '../../lib/search-param-table';
import { single, trimmed } from '../../lib/search-params';
import {
  type CategoryMode,
  INGREDIENT_ELEMENTS,
  NOMENCLATURE_KINDS,
} from '@/modules/ingredients/schema/ingredient-enums';

// The compendium search's parameters, each once (M8.13): the name in the
// address, how it is read, and the filter variable it becomes. The page reads
// its address through `COMPENDIUM_PARAMS.read`, every link and the pager write
// theirs through `.href`, and the filter form's fields name the same
// parameters. A new filter is one more entry here
// (claude-docs/components/ingredient-search.md, "The parameter table").
export const COMPENDIUM_PARAMS = defineSearchParams({
  query: textParam('query', 'query'),
  // A form by its text, `?form=Oil`, which the compendium read folds. The
  // box names one form; the read takes a list (M11.22).
  form: searchParam({
    name: 'form',
    variable: 'forms',
    read: trimmed,
    write: (form: string) => form,
    toVariable: (form) => (form ? [form] : undefined),
  }),
  // Blank is no filter: a native submit sends `nomenclature=`, and a kind no
  // classification holds is ignored, as a hand-edited cursor gets the first page.
  nomenclature: choiceParam('nomenclature', NOMENCLATURE_KINDS, 'nomenclature'),
  // Written `1`, the value its checkbox submits natively.
  withoutReferences: searchParam({
    name: 'withoutReferences',
    variable: 'withoutReferences',
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
});
