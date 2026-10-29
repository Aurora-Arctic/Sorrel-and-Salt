import 'server-only';
import { NotFound } from '../../../lib/errors';
import { readPageCursors } from '../../../lib/numbered-page';
import { single, trimmed } from '../../../lib/search-params';
import type { ListPlace, ListSearchParams } from './types';

// What every admin list page reads off its address and builds back into one: the cursor read and
// the `?edit=` lookup that turns a stale slug into a notice rather than an error page. The pager's
// two hrefs are `pagerHrefs` in src/lib/list-href.ts, pure so pages outside admin call it.

/**
 * The name filter, cursor and modal the address asks for. `own` is the page's own value of `?new`
 * beside the bare flag, as the compendium's `ingredient-compendium`.
 */
export function readListPlace(params: ListSearchParams, own?: string): ListPlace {
  const { after, before } = readPageCursors(params);
  const value = params.new === undefined ? undefined : (single(params.new) ?? '');
  return {
    // Blank is no filter: a native submit sends `query=`.
    query: trimmed(params.query),
    after,
    before,
    // Any `?new` holds an edit back, the shell's Add Ingredient's included, so one dialog
    // shows at a time; the edit opens when that dialog's close drops `new`.
    editSlug: value === undefined ? single(params.edit) : undefined,
    // `?new` is written bare (src/lib/list-href.ts), or with the page's own value. Any other
    // value, as `ingredient-coven-<slug>`, is the shell's Add Ingredient over the page.
    adding: value === '' || (own !== undefined && value === own),
  };
}

/**
 * What `read` finds, or `undefined` where the service says `NotFound`: the row `?edit=` names may
 * have been renamed or deleted since the link was made, which the page answers with
 * `MissingNotice` over the list rather than an error. Any other failure is still thrown.
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
 * The row `?edit=` names, read by `read`, and whether the address names one that is gone:
 * `missing` is what a page answers with `MissingNotice` over the list. An add wins over an
 * `?edit=`, so it reads nothing, and a blank `?edit=` names none.
 */
export async function readEditPlace<T>(
  { adding, editSlug }: Pick<ListPlace, 'adding' | 'editSlug'>,
  read: (slug: string) => Promise<T>,
): Promise<{ edited: T | undefined; missing: boolean }> {
  if (adding || !editSlug) return { edited: undefined, missing: false };
  const edited = await readOrMissing(() => read(editSlug));
  return { edited, missing: edited === undefined };
}
