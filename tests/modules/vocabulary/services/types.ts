import type { suggestCelestialBodies } from '@/modules/vocabulary';
import type { PageCount, PageEntry } from '@/lib/types';

export type Suggest = typeof suggestCelestialBodies;

export interface CachedVocabulary {
  table: string;
  list: () => Promise<PageEntry<{ id: string; name: string }>[]>;
  count: () => Promise<PageCount>;
}
