import type { Route } from 'next';
import { dialogParams, listHref } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import type { GroupKind } from '../GroupForm/types';
import { KINDS } from './kinds';
import type { GroupsPlace } from './types';

// The address of a group page under a name search, at a page, with a modal
// open over it or not: the list's links, the pager, the filter's submit and
// the modal's way back all build it. The page's own search and cursor stay,
// so closing the modal lands where it was opened. A blank search is written
// as none. `new` is a bare flag, read by its presence, as the categories
// page's is.

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
