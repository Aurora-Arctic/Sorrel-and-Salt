import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { choiceParam, defineSearchParams, searchParam } from '../../lib/search-param-table';
import { single } from '../../lib/search-params';
import { INGREDIENT_SOURCES } from '@/modules/ingredients/schema/ingredient-enums';

// The coven's ingredient search parameters: the compendium's table plus two filters only a coven has,
// without `reviewed`, a compendium entry's mark alone, `hidden`, a curator's listing, and `sort` and `order`, the admin list's column sort
// (claude-docs/components/ingredient-search.md, "The parameter table").
const {
  reviewed: _reviewed,
  hidden: _hidden,
  sort: _sort,
  order: _order,
  ...SHARED
} = COMPENDIUM_PARAMS.entries;

export const COVEN_PARAMS = defineSearchParams({
  ...SHARED,
  source: choiceParam('source', INGREDIENT_SOURCES, 'source'),
  inStock: searchParam({
    name: 'inStock',
    variable: 'inStock',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
  lowStockOnly: searchParam({
    name: 'lowStockOnly',
    variable: 'lowStockOnly',
    read: (raw) => single(raw) === '1',
    write: (on: boolean) => (on ? '1' : undefined),
    toVariable: (on) => on || undefined,
  }),
});
