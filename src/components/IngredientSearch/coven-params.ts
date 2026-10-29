import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { choiceParam, defineSearchParams, searchParam } from '../../lib/search-param-table';
import { single } from '../../lib/search-params';
import { INGREDIENT_SOURCES } from '@/modules/ingredients/schema/ingredient-enums';

// The coven's ingredient search parameters: the compendium's table plus two filters only a coven has,
// without `reviewed`, a compendium entry's mark alone
// (claude-docs/components/ingredient-search.md, "The parameter table").
const { reviewed: _reviewed, ...SHARED } = COMPENDIUM_PARAMS.entries;

export const COVEN_PARAMS = defineSearchParams({
  ...SHARED,
  // Only the coven's own entries (`?source=local`) or only those it holds a jar of from the
  // compendium (`?source=compendium`); a junk value reads as both.
  source: choiceParam('source', INGREDIENT_SOURCES, 'source'),
  // Only entries with a jar not at 0. Written `1`, the value its switch submits natively.
  inStock: searchParam({
    name: 'inStock',
    variable: 'inStock',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
  // Only entries with a jar badged Low Stock or Out of Stock. Written `1`, as inStock is.
  lowStockOnly: searchParam({
    name: 'lowStockOnly',
    variable: 'lowStockOnly',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
});
