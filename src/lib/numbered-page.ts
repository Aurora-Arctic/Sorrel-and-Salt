import { InvalidCursor } from './errors';
import { DEFAULT_PAGE_SIZE, resolveNumberedPage, resolvePage } from './pagination';
import { readableCursor, single } from './search-params';
import type {
  Cursor,
  Page,
  PageCount,
  PageEntry,
  PagePosition,
  PageRequest,
  PagerCursor,
} from './types';

// Shared by the admin tabs and the members page's pending list: each
// reads its cursors off its own query keys, since the members page already
// spends `?after` and `?before` on its roll.

export type PageKeys = { after: string; before: string };

const DEFAULT_PAGE_KEYS: PageKeys = { after: 'after', before: 'before' };

/** A cursor the codec reads but this list's key will not cast (one copied from another list) gives the first page. Any other failure is thrown. */
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

/** A list with no "Page X of Y": the same fallback to the first page for a cursor this list will not cast. */
export async function readCursorPage<T, Edge extends object = {}>(
  { after, before }: { after?: string; before?: string },
  fetch: (request: PageRequest) => Promise<PageEntry<T, Edge>[]>,
  size: number = DEFAULT_PAGE_SIZE,
): Promise<Page<T, Edge>> {
  const read = (cursors: { after?: string; before?: string }) =>
    resolvePage(
      cursors.after === undefined && cursors.before !== undefined
        ? { last: size, before: cursors.before }
        : { first: size, after: cursors.after },
      fetch,
    );
  try {
    return await read({ after, before });
  } catch (error) {
    if (error instanceof InvalidCursor && (after || before)) return read({});
    throw error;
  }
}

/** One cursor at a time: an address carrying both reads as the `after` page, and an unreadable cursor is none. */
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

/** The cursor a page's own place holds, for a list read in two steps: the `after` one when both are set, none for the first page. */
export function cursorOf(place: { after?: string; before?: string }): PagerCursor | undefined {
  return place.after ? { after: place.after } : place.before ? { before: place.before } : undefined;
}
