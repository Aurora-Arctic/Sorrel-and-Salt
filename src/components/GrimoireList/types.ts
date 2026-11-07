import type { Route } from 'next';
import type { SpellStatus } from '@/modules/grimoire';
import type { SearchCursor, SearchFilter } from '../../lib/search-param-table';
import type { PagePosition } from '../../lib/types';
import type { CompendiumCategoryChoice } from '../CompendiumList/types';
import type { SpellCardProps } from '../SpellCard/types';
import type { GRIMOIRE_PARAMS } from './params';

export type GrimoireListFilter = SearchFilter<typeof GRIMOIRE_PARAMS.entries>;

export type GrimoireSpell = Omit<SpellCardProps, 'level'>;

/** One value a grimoire facet offers, with how many spells of the tab it would leave. */
export interface GrimoireFacetChoice {
  value: string;
  label: string;
  count: number;
}

export interface GrimoireFacets {
  moonPhases: readonly GrimoireFacetChoice[];
  daysOfWeek: readonly GrimoireFacetChoice[];
  visibilities: readonly GrimoireFacetChoice[];
  makers: readonly GrimoireFacetChoice[];
}

export interface GrimoireListProps {
  path: Route;
  workspaceId: string;
  covenSlug: string;
  status: SpellStatus;
  spells: readonly GrimoireSpell[];
  filter: GrimoireListFilter;
  categories: readonly CompendiumCategoryChoice[];
  facets: GrimoireFacets;
  position?: PagePosition;
  cursor?: SearchCursor;
  total: number;
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
  'status' | 'filter' | 'canCreate' | 'path'
> {}
