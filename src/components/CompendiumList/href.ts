import type { Route } from 'next';
import { NEW_COMPENDIUM_ENTRY } from '../../lib/coven-path';
import { dialogParams } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import type { SearchCursor } from '../../lib/search-param-table';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumPlace, CovenListDialog, CovenListFilter } from './types';

// The address of `/admin/compendium` under a filter, at a page, with a modal
// open over it or not: the list's links, the pager, the filter's submit and
// the modal's way back all build it. The filter is written through the
// parameter table (`./params.ts`), the cursor, the details modal and the
// edit modal after it.

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
    // The details modal under any edit modal, so closing the edit goes back to it (M12.5).
    entry: place.entry,
    ...dialogParams(dialog),
    // New Entry names itself, so the shell's Add Ingredient can tell `?new` apart (M10.12).
    ...(dialog === 'new' && { new: NEW_COMPENDIUM_ENTRY }),
  });
}

/** A coven's Ingredients page (M9.6), unfiltered: where its filter submits, and what Clear opens. */
export const covenIngredientsPath = (covenSlug: string): Route =>
  `/coven/${covenSlug}/ingredients` as Route;

/**
 * The coven list under a filter, at a page, with a dialog open over it or not (M8.17):
 * its own entry's edit dialog (`?edit=<id>`) or a held compendium entry's
 * Annotate (`?annotate=<id>`). The details modal of the entry `entry` names
 * by id (M12.5) comes before either, so an edit opened over the details closes
 * back to them. The coven's twin of `compendiumHref`.
 */
export function covenIngredientsHref(
  covenSlug: string,
  place: Partial<CovenListFilter> & SearchCursor & { entry?: string },
  dialog?: CovenListDialog,
): Route {
  return COVEN_PARAMS.href(covenIngredientsPath(covenSlug), place, {
    after: place.after,
    before: place.before,
    entry: place.entry,
    ...(dialog && 'annotate' in dialog ? { annotate: dialog.annotate } : dialogParams(dialog)),
  });
}
