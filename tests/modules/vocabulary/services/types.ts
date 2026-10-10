import type { suggestPlanets } from '@/modules/vocabulary';
import type { PageCount, PageEntry } from '@/lib/types';

export type Suggest = typeof suggestPlanets;

/** A curated vocabulary's table, and its list and count read unfiltered (M8.6). */
export interface CachedVocabulary {
  table: string;
  list: () => Promise<PageEntry<{ id: string; name: string }>[]>;
  count: () => Promise<PageCount>;
}
