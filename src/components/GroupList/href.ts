import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { GroupKind } from '../GroupForm/types';
import type { GroupsDialog, GroupsPlace } from './types';

// The address of a group page at a page, with a modal open over it or not:
// the list's links, the pager and the modal's way back all build it. The
// page's own cursor stays, so closing the modal lands where it was opened.
// `new` is a bare flag, read by its presence, as the categories page's is.

const PATHS: Record<GroupKind, string> = {
  category: '/admin/category-groups',
  form: '/admin/form-groups',
  tradition: '/admin/deity-traditions',
};

export function groupsHref(kind: GroupKind, place: GroupsPlace, dialog?: GroupsDialog): Route {
  return listHref(PATHS[kind], {
    after: place.after,
    before: place.before,
    new: dialog === 'new',
    edit: dialog === 'new' ? undefined : dialog?.edit,
  });
}
