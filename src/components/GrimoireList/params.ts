import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { defineSearchParams } from '../../lib/search-param-table';

// The grimoire's search parameters (M10.11): the compendium's search text and its
// category filter with the match mode, taken as they are, so the filter row and the
// pager write the grimoire's address the way they write every other list's
// (claude-docs/components/ingredient-search.md, "The parameter table"). No status:
// Spells and Drafts are two tabs, two addresses, so the address never carries one.
const { query, categories, categoryMode } = COMPENDIUM_PARAMS.entries;

export const GRIMOIRE_PARAMS = defineSearchParams({ query, categories, categoryMode });
