import type { suggestCelestialBodies } from '@/modules/vocabulary';
import type { PageCount, PageEntry } from '@/lib/types';

export type Suggest = typeof suggestCelestialBodies;

/** A curated vocabulary's table, and its list and count read unfiltered. */
export interface CachedVocabulary {
  table: string;
  list: () => Promise<PageEntry<{ id: string; name: string }>[]>;
  count: () => Promise<PageCount>;
}
