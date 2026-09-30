import {
  getConnectionPageSize,
  parseCursorConnectionArgs,
  validateConnectionArguments,
} from '@pothos/core';
import { InvalidCursor } from './errors';
import type { ConnectionArgs, Cursor, PageRequest, PageEntry, Page } from './types';

// CLAUDE.md rule 8, the one pagination rule: the numbers, the cursor codec,
// and the page a connection is built from; the shapes they pass are in
// `types.ts`. claude-docs/graphql.md, "Pagination".

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
