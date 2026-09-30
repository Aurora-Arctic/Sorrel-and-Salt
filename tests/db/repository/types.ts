import type { PageCount } from '@/lib/types';

/** Every page of a filter, followed to the end: the ids in order, and the count each page read. */
export interface Walk {
  ids: string[];
  counts: PageCount[];
}
