import 'server-only';
import { orMissing } from '../../../lib/or-not-found';
import { readPageCursors } from '../../../lib/numbered-page';
import { single, trimmed } from '../../../lib/search-params';
import type { ListPlace, ListSearchParams } from './types';

// What every admin list page reads off its address and builds back into one: the cursor read and
// the `?edit=` lookup that turns a stale slug into a notice rather than an error page. The pager's
// two hrefs are `pagerHrefs` in src/lib/list-href.ts, pure so pages outside admin call it.

export function readListPlace(params: ListSearchParams, own?: string): ListPlace {
  const { after, before } = readPageCursors(params);
  const value = params.new === undefined ? undefined : (single(params.new) ?? '');
  return {
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

export async function readEditPlace<T>(
  { adding, editSlug }: Pick<ListPlace, 'adding' | 'editSlug'>,
  read: (slug: string) => Promise<T>,
): Promise<{ edited: T | undefined; missing: boolean }> {
  if (adding || !editSlug) return { edited: undefined, missing: false };
  const edited = await orMissing(() => read(editSlug));
  return { edited, missing: edited === undefined };
}
