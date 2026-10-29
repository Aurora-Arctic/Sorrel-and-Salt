import {
  getConnectionPageSize,
  parseCursorConnectionArgs,
  validateConnectionArguments,
} from '@pothos/core';
import { InvalidCursor } from './errors';
import type {
  ConnectionArgs,
  Cursor,
  Page,
  PageCount,
  PageEntry,
  PagePosition,
  PageRequest,
} from './types';

// CLAUDE.md rule 8, the one pagination rule: the numbers, the cursor codec,
// and the page a connection is built from; the shapes they pass are in
// `types.ts`. claude-docs/graphql/pagination.md, "Pagination".

export const DEFAULT_PAGE_SIZE = 25;
/** What a card list pages by: 24 divides by 1, 2, 3 and 4 columns, so the last row of the grid is full. */
export const CARD_PAGE_SIZE = 24;
/** The hard server-side maximum. A client asking for more gets this many, not an error. */
export const MAX_PAGE_SIZE = 100;

const LIMITS = { defaultSize: DEFAULT_PAGE_SIZE, maxSize: MAX_PAGE_SIZE };

/**
 * The rows a page will hold: the client's `first` or `last`, 25 without one,
 * and never more than 100. The one number the complexity limit prices a
 * connection by, so a query costs what it will actually fetch.
 */
export function pageSize(args: Pick<ConnectionArgs, 'first' | 'last'>): number {
  validateConnectionArguments(args);
  return getConnectionPageSize({ args, ...LIMITS }).expectedSize;
}

export function encodeCursor({ key, id }: Cursor): string {
  return Buffer.from(JSON.stringify({ k: key, i: id }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): Cursor {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursor();
  }
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    !('k' in decoded) ||
    !('i' in decoded) ||
    !Array.isArray(decoded.k) ||
    decoded.k.length === 0 ||
    !decoded.k.every((part) => typeof part === 'string') ||
    typeof decoded.i !== 'string' ||
    decoded.i === ''
  ) {
    throw new InvalidCursor();
  }
  return { key: decoded.k as string[], id: decoded.i };
}

/**
 * A connection from a page finder: decodes the cursors, clamps the size, asks `fetch` for one row more than the page, and builds
 * the edges and page info. `fetch` sees a `PageRequest`, never the raw arguments, so no finder can skip the clamp.
 */
export async function resolvePage<T, Edge extends object = {}>(
  args: ConnectionArgs,
  fetch: (request: PageRequest) => PageEntry<T, Edge>[] | Promise<PageEntry<T, Edge>[]>,
): Promise<Page<T, Edge>> {
  const after = args.after == null ? undefined : decodeCursor(args.after);
  const before = args.before == null ? undefined : decodeCursor(args.before);
  const { limit, expectedSize, inverted, hasNextPage, hasPreviousPage } = parseCursorConnectionArgs(
    { args, ...LIMITS },
  );

  const entries = await fetch({
    ...(after && { after }),
    ...(before && { before }),
    limit,
    inverted,
  });

  const page = entries.slice(0, expectedSize);
  if (inverted) page.reverse();
  const edges = page.map(({ cursor, ...edge }) => ({
    ...edge,
    cursor: encodeCursor(cursor),
  })) as Page<T, Edge>['edges'];

  return {
    edges,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
      hasNextPage: hasNextPage(entries.length),
      hasPreviousPage: hasPreviousPage(entries.length),
    },
  };
}

/**
 * One page of a list, `size` rows (`DEFAULT_PAGE_SIZE`, or `CARD_PAGE_SIZE` for a card list) after `after` or before `before`, with its
 * position for "Page X of Y": `count` reads the total and the rows before the page, and the page is floor(before / size) + 1 of
 * ceil(total / size), never under one. Every admin list reads through it, so the arithmetic is written once.
 */
export async function resolveNumberedPage<T, Edge extends object = {}>(
  { after, before }: { after?: string; before?: string },
  fetch: (request: PageRequest) => PageEntry<T, Edge>[] | Promise<PageEntry<T, Edge>[]>,
  count: (start: Cursor | undefined) => Promise<PageCount>,
  size: number = DEFAULT_PAGE_SIZE,
): Promise<Page<T, Edge> & { position: PagePosition; totalCount: number }> {
  const args: ConnectionArgs =
    after === undefined && before !== undefined ? { last: size, before } : { first: size, after };
  const page = await resolvePage(args, fetch);
  const { totalCount, countBefore } = await count(
    page.pageInfo.startCursor ? decodeCursor(page.pageInfo.startCursor) : undefined,
  );
  const position = {
    page: Math.floor((countBefore ?? 0) / size) + 1,
    pages: Math.max(1, Math.ceil(totalCount / size)),
  };
  return { ...page, position, totalCount };
}

/**
 * Every row a page finder holds, read `MAX_PAGE_SIZE` at a time in its own order, for a service that must act on all of them. Through
 * the finder, not an unpaged read, so "live" means what the list means and no read is unbounded.
 */
export async function allPages<T, Edge extends object = {}>(
  read: (request: PageRequest) => Promise<PageEntry<T, Edge>[]>,
): Promise<T[]> {
  const rows: T[] = [];
  let after: Cursor | undefined;
  for (;;) {
    const page = await read({ after, limit: MAX_PAGE_SIZE, inverted: false });
    rows.push(...page.map(({ node }) => node));
    if (page.length < MAX_PAGE_SIZE) return rows;
    after = page[page.length - 1].cursor;
  }
}
