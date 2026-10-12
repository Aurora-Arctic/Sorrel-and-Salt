import 'server-only';
import type { Route } from 'next';
import Link from 'next/link';
import { InvalidCursor, NotFound } from '../../lib/errors';
import { resolveNumberedPage } from '../../lib/pagination';
import { readableCursor, single, trimmed } from '../../lib/search-params';
import type {
  Cursor,
  Page,
  PageCount,
  PageEntry,
  PagePosition,
  PageRequest,
} from '../../lib/types';
import type { AddActionProps, ListPlace, ListSearchParams, PagerCursor, PagerHrefs } from './types';

// What every admin list page reads off its address and builds back into one,
// written once (MB.115) after ten pages had each carried the cursor read, the
// pager's two hrefs and the `?edit=` lookup that turns a stale slug into a
// notice rather than an error page. Modelled on the planets' and signs' page
// module, the one shape two routes already shared, now `value-page.tsx`.

/** The name filter, cursor and modal the address asks for. */
export function readListPlace(params: ListSearchParams): ListPlace {
  const after = readableCursor(single(params.after));
  return {
    // Blank is no filter: a native submit sends `query=`.
    query: trimmed(params.query),
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
 * One numbered page of a list, through `resolveNumberedPage`, or its first
 * page again for a cursor that names no row of it: one the codec reads but
 * this list's key will not cast, as a cursor copied from another list is.
 * Any other failure is still thrown.
 */
export async function readNumberedPage<T>(
  { after, before }: { after?: string; before?: string },
  fetch: (request: PageRequest) => Promise<PageEntry<T>[]>,
  count: (start: Cursor | undefined) => Promise<PageCount>,
): Promise<Page<T> & { position: PagePosition }> {
  try {
    return await resolveNumberedPage({ after, before }, fetch, count);
  } catch (error) {
    if (error instanceof InvalidCursor && (after || before)) {
      return resolveNumberedPage({}, fetch, count);
    }
    throw error;
  }
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

/**
 * The row `?edit=` names, read by `read`, and whether the address names one
 * that is gone: `missing` is what a page answers with `MissingNotice` over the
 * list. An add wins over an `?edit=`, so it reads nothing, and a blank
 * `?edit=` names none.
 */
export async function readEditPlace<T>(
  { adding, editSlug }: Pick<ListPlace, 'adding' | 'editSlug'>,
  read: (slug: string) => Promise<T>,
): Promise<{ edited: T | undefined; missing: boolean }> {
  if (adding || !editSlug) return { edited: undefined, missing: false };
  const edited = await readOrMissing(() => read(editSlug));
  return { edited, missing: edited === undefined };
}

/** A list page's Add, the open tab's action beside the page's heading, at `href` so it keeps the list's place. */
export function AddAction({ href, children }: AddActionProps) {
  return (
    <Link className="btn btn--solid" href={href}>
      {children}
    </Link>
  );
}
