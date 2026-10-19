import type { Route } from 'next';
import { dialogParams } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumPlace } from './types';

// The address of `/admin/compendium` under a filter, at a page, with a modal
// open over it or not: the list's links, the pager, the filter's submit and
// the modal's way back all build it. The filter is written through the
// parameter table (`./params.ts`), the cursor and the modal after it.

/** The page itself, unfiltered: where the filter submits, and what Clear opens. */
export const COMPENDIUM_PATH: Route = '/admin/compendium';

/** The public compendium (M8.18): the same filter and cursor, no modal. */
export const PUBLIC_COMPENDIUM_PATH: Route = '/compendium';

export function compendiumHref(
  place: CompendiumPlace,
  dialog?: ListDialog,
  path: Route = COMPENDIUM_PATH,
): Route {
  return COMPENDIUM_PARAMS.href(path, place, {
    after: place.after,
    before: place.before,
    ...dialogParams(dialog),
  });
}
