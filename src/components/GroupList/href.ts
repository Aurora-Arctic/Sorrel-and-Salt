import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { GroupKind } from '../GroupForm/types';
import type { GroupsDialog, GroupsPlace } from './types';

// The address of a group page under a name search, at a page, with a modal
// open over it or not: the list's links, the pager, the filter's submit and
// the modal's way back all build it. The page's own search and cursor stay,
// so closing the modal lands where it was opened. A blank search is written
// as none. `new` is a bare flag, read by its presence, as the categories
// page's is.

const PATHS: Record<GroupKind, string> = {
  category: '/admin/category-groups',
  form: '/admin/form-groups',
  tradition: '/admin/deity-traditions',
};

/** The page itself, unfiltered: where the filter submits, and what Clear Filters opens. */
export function groupsPath(kind: GroupKind): Route {
  return PATHS[kind] as Route;
}

export function groupsHref(kind: GroupKind, place: GroupsPlace, dialog?: GroupsDialog): Route {
  return listHref(PATHS[kind], {
    query: place.query,
    after: place.after,
    before: place.before,
    new: dialog === 'new',
    edit: dialog === 'new' ? undefined : dialog?.edit,
  });
}
