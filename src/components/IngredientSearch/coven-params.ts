import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { choiceParam, defineSearchParams, flagParam } from '../../lib/search-param-table';
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
  // Written `1`, the value its switch submits natively.
  inStock: flagParam('inStock'),
  lowStockOnly: flagParam('lowStockOnly'),
});
