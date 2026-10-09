import type { Route } from 'next';
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
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(['after', 'before'] as const).flatMap((name) => {
      const value = place[name];
      return value ? [pair(name, value)] : [];
    }),
    ...(dialog === 'new' ? ['new'] : dialog ? [pair('edit', dialog.edit)] : []),
  ];
  return (parts.length ? `${PATHS[kind]}?${parts.join('&')}` : PATHS[kind]) as Route;
}
