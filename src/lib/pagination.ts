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
 * A connection from a page finder: decodes the cursors, clamps the size, asks
 * `fetch` for one row more than the page, and builds the edges and page info
 * from what came back. `fetch` sees a `PageRequest` and never the client's
 * raw arguments, so no finder can skip the clamp.
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
 * One page of an admin list, `DEFAULT_PAGE_SIZE` rows after `after` or else
 * before `before`, and where it stands, for the pager's "Page X of Y":
 * `count` reads the list's total and the rows before the page's first row —
 * none on an empty page — and the position is page floor(before / size) + 1
 * of ceil(total / size), never fewer than one. Every admin list page reads
 * through it, so the arithmetic is written once (MB.132).
 */
export async function resolveNumberedPage<T, Edge extends object = {}>(
  { after, before }: { after?: string; before?: string },
  fetch: (request: PageRequest) => PageEntry<T, Edge>[] | Promise<PageEntry<T, Edge>[]>,
  count: (start: Cursor | undefined) => Promise<PageCount>,
): Promise<Page<T, Edge> & { position: PagePosition }> {
  const args: ConnectionArgs =
    after === undefined && before !== undefined
      ? { last: DEFAULT_PAGE_SIZE, before }
      : { first: DEFAULT_PAGE_SIZE, after };
  const page = await resolvePage(args, fetch);
  const { totalCount, countBefore } = await count(
    page.pageInfo.startCursor ? decodeCursor(page.pageInfo.startCursor) : undefined,
  );
  const position = {
    page: Math.floor((countBefore ?? 0) / DEFAULT_PAGE_SIZE) + 1,
    pages: Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE)),
  };
  return { ...page, position };
}
