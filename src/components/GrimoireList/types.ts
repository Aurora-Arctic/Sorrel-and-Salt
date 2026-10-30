import type { Route } from 'next';
import type { SpellStatus } from '@/modules/grimoire';
import type { SearchCursor, SearchFilter } from '../../lib/search-param-table';
import type { PagePosition } from '../../lib/types';
import type { CompendiumCategoryChoice } from '../CompendiumList/types';
import type { SpellCardProps } from '../SpellCard/types';
import type { GRIMOIRE_PARAMS } from './params';

/** The grimoire's filter as its address holds it: the search text and the categories with their match mode. */
export type GrimoireListFilter = SearchFilter<typeof GRIMOIRE_PARAMS.entries>;

/** One spell as its card draws it. */
export type GrimoireSpell = Omit<SpellCardProps, 'level'>;

/** One value a grimoire facet offers, with how many spells of the tab it would leave. */
export interface GrimoireFacetChoice {
  value: string;
  label: string;
  count: number;
}

/** The four facets' choices: every value on offer, picked or not, in the order shown. */
export interface GrimoireFacets {
  moonPhases: readonly GrimoireFacetChoice[];
  daysOfWeek: readonly GrimoireFacetChoice[];
  visibilities: readonly GrimoireFacetChoice[];
  makers: readonly GrimoireFacetChoice[];
}

export interface GrimoireListProps {
  /** The tab's own address, Spells' or Drafts': the filter's GET target and what Clear All opens. */
  path: Route;
  /** The coven the title search suggests from. */
  workspaceId: string;
  /** The coven's slug, which each spell's recipe page address is built from. */
  covenSlug: string;
  /** The tab's status, which the title search keeps to. */
  status: SpellStatus;
  spells: readonly GrimoireSpell[];
  filter: GrimoireListFilter;
  /** Every category the filter offers, by slug. */
  categories: readonly CompendiumCategoryChoice[];
  /** Moon Phases, Days of the Week, Visibility and Coven Members, each with its counts. */
  facets: GrimoireFacets;
  position?: PagePosition;
  /** The cursor of the page shown, which a picked title's Quick Look opens over and closes back to. */
  cursor?: SearchCursor;
  /** How many spells the filter found on this tab, every page. */
  total: number;
  /** The viewer may write a spell: an empty Spells tab then names no roles. */
  canCreate: boolean;
  previousHref?: Route;
  nextHref?: Route;
}

export interface GrimoireFilterProps extends Pick<
  GrimoireListProps,
  'path' | 'workspaceId' | 'status' | 'filter' | 'categories' | 'facets' | 'total' | 'cursor'
> {}

export interface EmptyGrimoireProps extends Pick<
  GrimoireListProps,
  'status' | 'filter' | 'canCreate'
> {}
