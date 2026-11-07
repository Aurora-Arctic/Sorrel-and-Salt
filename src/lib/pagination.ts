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

// CLAUDE.md rule 8, the one pagination rule (claude-docs/graphql/pagination.md, "Pagination").

export const DEFAULT_PAGE_SIZE = 25;
/** What a card list pages by: 24 divides by 1, 2, 3 and 4 columns, so the last row of the grid is full. */
export const CARD_PAGE_SIZE = 24;
/** A client asking for more gets this many, not an error. */
export const MAX_PAGE_SIZE = 100;

const LIMITS = { defaultSize: DEFAULT_PAGE_SIZE, maxSize: MAX_PAGE_SIZE };

/** The one number the complexity limit prices a connection by, so a query costs what it will actually fetch. */
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
