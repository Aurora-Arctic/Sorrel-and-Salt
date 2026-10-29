import type { Route } from 'next';
import { dialogParams, listHref } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import type { GroupKind } from '../GroupForm/types';
import { KINDS } from './kinds';
import type { GroupsPlace } from './types';

// Builds the address of a group page for a name search, page and open modal; the page's own search
// and cursor stay, so closing the modal lands where it opened. A blank search is none, and `new` is
// a bare flag.

/** The page itself, unfiltered: where the filter submits, and what Clear opens. */
export function groupsPath(kind: GroupKind): Route {
  return KINDS[kind].path;
}

export function groupsHref(kind: GroupKind, place: GroupsPlace, dialog?: ListDialog): Route {
  return listHref(KINDS[kind].path, {
    query: place.query,
    after: place.after,
    before: place.before,
    ...dialogParams(dialog),
  });
}
