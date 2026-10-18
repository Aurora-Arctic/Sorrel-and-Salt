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

export function compendiumHref(place: CompendiumPlace, dialog?: ListDialog): Route {
  return COMPENDIUM_PARAMS.href(COMPENDIUM_PATH, place, {
    after: place.after,
    before: place.before,
    ...dialogParams(dialog),
  });
}
