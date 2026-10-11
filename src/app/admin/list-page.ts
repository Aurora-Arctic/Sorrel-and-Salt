import 'server-only';
import type { Route } from 'next';
import { NotFound } from '../../lib/errors';
import { readableCursor, single } from '../../lib/search-params';
import type { Page } from '../../lib/types';
import type { ListPlace, ListSearchParams, PagerCursor, PagerHrefs } from './types';

// What every admin list page reads off its address and builds back into one,
// written once (MB.115) after ten pages had each carried the cursor read, the
// pager's two hrefs and the `?edit=` lookup that turns a stale slug into a
// notice rather than an error page. Modelled on `vocabulary-page.tsx`, the one
// page shape two routes already shared.

/** The name filter, cursor and modal the address asks for. */
export function readListPlace(params: ListSearchParams): ListPlace {
  const after = readableCursor(single(params.after));
  return {
    // Blank is no filter: a native submit sends `query=`.
    query: single(params.query)?.trim() ?? '',
    after,
    // One cursor at a time: an address carrying both reads as `after`'s page.
    before: after ? undefined : readableCursor(single(params.before)),
    editSlug: single(params.edit),
    // By presence: `?new` is written bare (src/lib/list-href.ts).
    adding: params.new !== undefined,
  };
}

/**
 * The pager's Prev and Next for a page, each built by `build` from the cursor
 * it turns on, so the caller keeps its filter and drops any modal. An end
 * with no page beyond it is left out, and `Pager` disables it.
 */
export function pagerHrefs(
  pageInfo: Page<unknown>['pageInfo'],
  build: (cursor: PagerCursor) => Route,
): PagerHrefs {
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = pageInfo;
  return {
    previousHref: hasPreviousPage && startCursor ? build({ before: startCursor }) : undefined,
    nextHref: hasNextPage && endCursor ? build({ after: endCursor }) : undefined,
  };
}

/**
 * What `read` finds, or `undefined` where the service says `NotFound`: the
 * row `?edit=` names may have been renamed or deleted since the link was
 * made, which the page answers with `MissingNotice` over the list rather than
 * an error. Any other failure is still thrown.
 */
export async function readOrMissing<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}
