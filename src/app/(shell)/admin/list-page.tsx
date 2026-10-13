import 'server-only';
import { NotFound } from '../../../lib/errors';
import { readPageCursors } from '../../../lib/numbered-page';
import { single, trimmed } from '../../../lib/search-params';
import type { ListPlace, ListSearchParams } from './types';

// What every admin list page reads off its address and builds back into one,
// written once (MB.115) after ten pages had each carried the cursor read and
// the `?edit=` lookup that turns a stale slug into a notice rather than an
// error page. The pager's two hrefs, written here once too, are `pagerHrefs`
// in src/lib/list-href.ts since MB.119: pure, so pages outside admin call it.
// Modelled on the celestial bodies' and signs' page module, the one shape two
// routes already shared, now `value-page.tsx`.

/** The name filter, cursor and modal the address asks for. */
export function readListPlace(params: ListSearchParams): ListPlace {
  const { after, before } = readPageCursors(params);
  return {
    // Blank is no filter: a native submit sends `query=`.
    query: trimmed(params.query),
    after,
    before,
    editSlug: single(params.edit),
    // By presence: `?new` is written bare (src/lib/list-href.ts).
    adding: params.new !== undefined,
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
