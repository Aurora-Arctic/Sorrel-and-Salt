import type { Route } from 'next';
import type { CategoriesCursor, CategoriesDialog } from './types';

// The address of `/admin/categories` at a page, with a modal open over it or
// not: the list's links, the pager and the modal's way back all build it. The
// page's own cursor stays, so closing the modal lands where it was opened.
// `new` is a bare flag, read by its presence, as the user list's `awaiting`.

const PATH = '/admin/categories';

export function categoriesHref(cursor: CategoriesCursor, dialog?: CategoriesDialog): Route {
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(cursor.after ? [pair('after', cursor.after)] : []),
    ...(cursor.before ? [pair('before', cursor.before)] : []),
    ...(dialog === 'new' ? ['new'] : dialog ? [pair('edit', dialog.edit)] : []),
  ];
  return (parts.length ? `${PATH}?${parts.join('&')}` : PATH) as Route;
}
