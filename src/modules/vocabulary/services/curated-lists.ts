import 'server-only';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId } from '../../../lib/validation';

// How a curated vocabulary's list and its count read their filter, written
// once for the three filtered by a group (categories, forms, deities). Each
// service still builds its own two cached reads, so each cache key is spelled
// where tests/guards/compendium-cache.test.ts looks for it; this file only
// wraps them. Internal to the module; the index exports no part of it.

/**
 * The filter as the repository reads it, its query trimmed and a blank one
 * dropped; `undefined` when `idKey` holds an id that is not a uuid, which
 * names nothing and would be a driver error at the comparison. Without an
 * `idKey` there is no id to refuse, so the filter always reads.
 */
export function readableFilter<Filter extends { query?: string }>(filter: Filter): Filter;
export function readableFilter<Filter extends { query?: string }>(
  filter: Filter,
  idKey: Exclude<keyof Filter, 'query'>,
): Filter | undefined;
export function readableFilter<Filter extends { query?: string }>(
  filter: Filter,
  idKey?: Exclude<keyof Filter, 'query'>,
): Filter | undefined {
  const id = idKey === undefined ? undefined : filter[idKey];
  if (id !== undefined && !RowId.safeParse(id).success) return undefined;
  return { ...filter, query: filter.query?.trim() || undefined };
}

/**
 * A filtered list and its count over the two cached reads given, each reading
 * `readableFilter`'s answer: a filter naming no group lists nothing and counts
 * nothing, without a read.
 */
export function cachedFilteredList<Filter extends { query?: string }, Row>(
  cachedPage: (filter: Filter, page: PageRequest) => Promise<PageEntry<Row>[]>,
  cachedCount: (filter: Filter, start: Cursor | undefined) => Promise<PageCount>,
  idKey: Exclude<keyof Filter, 'query'>,
): {
  list: (filter: Filter, page: PageRequest) => Promise<PageEntry<Row>[]>;
  count: (filter: Filter, start: Cursor | undefined) => Promise<PageCount>;
} {
  return {
    list: async (filter, page) => {
      const read = readableFilter(filter, idKey);
      return read ? cachedPage(read, page) : [];
    },
    count: async (filter, start) => {
      const read = readableFilter(filter, idKey);
      return read ? cachedCount(read, start) : { totalCount: 0, countBefore: null };
    },
  };
}
