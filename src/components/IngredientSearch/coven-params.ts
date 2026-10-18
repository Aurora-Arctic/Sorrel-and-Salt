import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { choiceParam, defineSearchParams, searchParam } from '../../lib/search-param-table';
import { single } from '../../lib/search-params';
import { INGREDIENT_SOURCES } from '@/modules/ingredients/schema/ingredient-enums';

// The coven's ingredient search parameters (M9.7): the compendium's table and two
// filters only a coven has, because only a coven holds stock and entries of its own.
// The compendium's entries are spread in as they are, so its table and every caller
// of it are untouched; this is the "one new entry" the table promises
// (claude-docs/components/ingredient-search.md, "The parameter table").
export const COVEN_PARAMS = defineSearchParams({
  ...COMPENDIUM_PARAMS.entries,
  // Only the coven's own entries, `?source=local`, or only those it holds a jar of
  // from the compendium, `?source=compendium`. Left out for both, so a junk value
  // reads as both.
  source: choiceParam('source', INGREDIENT_SOURCES, 'source'),
  // Only entries with a jar not at 0. Written `1`, the value its switch submits natively.
  inStockOnly: searchParam({
    name: 'inStockOnly',
    variable: 'inStockOnly',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
});
