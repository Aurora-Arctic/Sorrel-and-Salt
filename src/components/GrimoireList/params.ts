import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { RowId } from '../../lib/validation';
import { list } from '../../lib/search-params';
import {
  defineSearchParams,
  listParam,
  searchParam,
  textListParam,
} from '../../lib/search-param-table';

// The grimoire's search parameters (M10.11, M13.22): the compendium's search text and its
// category filter with the match mode, taken as they are, so the filter row and the
// pager write the grimoire's address the way they write every other list's
// (claude-docs/components/ingredient-search.md, "The parameter table"). No status:
// Spells and Drafts are two tabs, two addresses, so the address never carries one.
// The four facets beside them: Moon Phase and Day of Week are free text (a spell's own
// words, so an uncurated value stays valid), Visibility is the fixed pair, and Coven Member
// is the ids of the members who made the spells, each checked as an id and a repeat dropped.
const { query, categories, categoryMode } = COMPENDIUM_PARAMS.entries;

/** The two visibilities a spell has, as the address spells them. */
export const VISIBILITIES = ['private', 'workspace'] as const;

export const GRIMOIRE_PARAMS = defineSearchParams({
  query,
  categories,
  categoryMode,
  moonPhases: textListParam('moonPhase', 'moonPhases'),
  daysOfWeek: textListParam('dayOfWeek', 'daysOfWeek'),
  visibilities: listParam('visibility', VISIBILITIES, 'visibilities'),
  makers: searchParam<string[]>({
    name: 'maker',
    variable: 'makerIds',
    // A hand-edited value that is not an id reads as no filter, as a bad enum value does.
    read: (raw) => [...new Set(list(raw).filter((id) => RowId.safeParse(id).success))],
    write: (value) => value,
    toVariable: (value) => (value.length > 0 ? value : undefined),
  }),
});
