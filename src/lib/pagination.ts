import {
  getConnectionPageSize,
  parseCursorConnectionArgs,
  validateConnectionArguments,
} from '@pothos/core';
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, decodeCursor, encodeCursor } from './cursor';
import type {
  ConnectionArgs,
  Cursor,
  Page,
  PageCount,
  PageEntry,
  PagePosition,
  PageRequest,
} from './types';

// CLAUDE.md rule 8, the one pagination rule (claude-docs/graphql/pagination.md, "Pagination"). The sizes
// and the cursor codec live in `cursor.ts`, which the browser loads too.

export {
  CARD_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
} from './cursor';

const LIMITS = { defaultSize: DEFAULT_PAGE_SIZE, maxSize: MAX_PAGE_SIZE };

/** The one number the complexity limit prices a connection by, so a query costs what it will actually fetch. */
export function pageSize(args: Pick<ConnectionArgs, 'first' | 'last'>): number {
  validateConnectionArguments(args);
  return getConnectionPageSize({ args, ...LIMITS }).expectedSize;
}

/** `fetch` sees a `PageRequest`, never the raw arguments, so no finder can skip the clamp. */
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

/** Every admin list reads through it, so the arithmetic is written once: the page is floor(before / size) + 1 of ceil(total / size), never under one. */
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

/** Through the finder, not an unpaged read, so "live" means what the list means and no read is unbounded. */
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
