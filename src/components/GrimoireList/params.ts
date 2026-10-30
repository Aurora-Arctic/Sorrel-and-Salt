import { COMPENDIUM_PARAMS } from '../CompendiumList/params';
import { RowId } from '../../lib/validation';
import { list } from '../../lib/search-params';
import {
  defineSearchParams,
  choiceParam,
  searchParam,
  textListParam,
} from '../../lib/search-param-table';

// The grimoire's search parameters: the compendium's text and category filter with the match mode (claude-docs/components/ingredient-search.md,
// "The parameter table"), no status, plus Moon Phases and Days of the Week (free text), Visibility (a fixed
// pair) and Coven Members (makers' ids, each checked, repeats dropped).
const { query, categories, categoryMode } = COMPENDIUM_PARAMS.entries;

/** The two visibilities a spell has, as the address spells them. */
export const VISIBILITIES = ['private', 'workspace'] as const;

/** What each visibility is called on screen: a spell shared with the coven reads "Shared". */
export const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], string> = {
  private: 'Private',
  workspace: 'Shared',
};

export const GRIMOIRE_PARAMS = defineSearchParams({
  query,
  categories,
  categoryMode,
  moonPhases: textListParam('moonPhase', 'moonPhases'),
  daysOfWeek: textListParam('dayOfWeek', 'daysOfWeek'),
  // One value, not a list: a three-way toggle whose Any is the address with no `visibility`
  // in it. The query still reads a list, so the one pick travels as a one-item list.
  visibility: {
    ...choiceParam('visibility', VISIBILITIES, 'visibilities'),
    toVariable: (value: (typeof VISIBILITIES)[number] | '') => (value ? [value] : undefined),
  },
  makers: searchParam<string[]>({
    name: 'maker',
    variable: 'makerIds',
    // A hand-edited value that is not an id reads as no filter, as a bad enum value does.
    read: (raw) => [...new Set(list(raw).filter((id) => RowId.safeParse(id).success))],
    write: (value) => value,
    toVariable: (value) => (value.length > 0 ? value : undefined),
  }),
});
