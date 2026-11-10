import type { Route } from 'next';
import { NEW_COMPENDIUM_ENTRY, covenPath } from '../../lib/coven-path';
import { dialogParams } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import type { SearchCursor } from '../../lib/search-param-table';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumPlace, CovenListDialog, CovenListFilter } from './types';

export const COMPENDIUM_PATH: Route = '/curator/compendium';

export const PUBLIC_COMPENDIUM_PATH: Route = '/compendium';

export function compendiumHref(
  place: CompendiumPlace,
  dialog?: ListDialog,
  path: Route = COMPENDIUM_PATH,
): Route {
  return COMPENDIUM_PARAMS.href(path, place, {
    after: place.after,
    before: place.before,
    // The details modal stays under any edit modal, so closing the edit goes back to it.
    entry: place.entry,
    ...dialogParams(dialog),
    // New Entry names itself, so the shell's Add Ingredient can tell `?new` apart.
    ...(dialog === 'new' && { new: NEW_COMPENDIUM_ENTRY }),
  });
}

/**
 * The coven list under a filter, at a page, with a dialog open over it or not: an entry's edit
 * (`?edit=<id>`) or a held entry's Annotate (`?annotate=<id>`). The details modal's `entry` comes before
 * either, so an edit over the details closes back to them. The coven's twin of `compendiumHref`.
 */
export function covenIngredientsHref(
  covenSlug: string,
  place: Partial<CovenListFilter> & SearchCursor & { entry?: string },
  dialog?: CovenListDialog,
): Route {
  return COVEN_PARAMS.href(covenPath(covenSlug, 'ingredients'), place, {
    after: place.after,
    before: place.before,
    entry: place.entry,
    ...(dialog && 'annotate' in dialog ? { annotate: dialog.annotate } : dialogParams(dialog)),
  });
}
