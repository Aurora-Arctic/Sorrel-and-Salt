import {
  defineSearchParams,
  listParam,
  searchParam,
  textParam,
} from '../../lib/search-param-table';
import { oneOf, single, trimmed } from '../../lib/search-params';
import {
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
  nomenclature: searchParam({
    name: 'nomenclature',
    variable: 'nomenclature',
    read: (raw) => oneOf(NOMENCLATURE_KINDS, single(raw)) ?? '',
    write: (kind: (typeof NOMENCLATURE_KINDS)[number] | '') => kind,
    toVariable: (kind) => kind || undefined,
  }),
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
});
