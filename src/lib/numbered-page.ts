import { InvalidCursor } from './errors';
import { resolveNumberedPage } from './pagination';
import { readableCursor, single } from './search-params';
import type { Cursor, Page, PageCount, PageEntry, PagePosition, PageRequest } from './types';

// Shared by the admin tabs and the members page's pending list: each
// reads its cursors off its own query keys, since the members page already
// spends `?after` and `?before` on its roll.

/** The two query keys a list reads its cursors from. */
export type PageKeys = { after: string; before: string };

export const DEFAULT_PAGE_KEYS: PageKeys = { after: 'after', before: 'before' };

/**
 * One numbered page of a list through `resolveNumberedPage`, or its first page again for a cursor the codec reads but this list's key will not cast (one
 * copied from another list). Any other failure is thrown.
 */
export async function readNumberedPage<T, Edge extends object = {}>(
  { after, before }: { after?: string; before?: string },
  fetch: (request: PageRequest) => Promise<PageEntry<T, Edge>[]>,
  count: (start: Cursor | undefined) => Promise<PageCount>,
  size?: number,
): Promise<Page<T, Edge> & { position: PagePosition; totalCount: number }> {
  try {
    return await resolveNumberedPage({ after, before }, fetch, count, size);
  } catch (error) {
    if (error instanceof InvalidCursor && (after || before)) {
      return resolveNumberedPage({}, fetch, count, size);
    }
    throw error;
  }
}

/**
 * The cursors an address asks for under `keys` (`?after` and `?before` unless
 * the caller names its own). One cursor at a time: an address carrying both
 * reads as the `after` page, and an unreadable cursor is none.
 */
export function readPageCursors(
  params: object,
  keys: PageKeys = DEFAULT_PAGE_KEYS,
): { after: string | undefined; before: string | undefined } {
  // An interface has no index signature, so a page's own params type needs the cast.
  const read = (key: string) =>
    readableCursor(single((params as Record<string, string | string[] | undefined>)[key]));
  const after = read(keys.after);
  return { after, before: after ? undefined : read(keys.before) };
}
