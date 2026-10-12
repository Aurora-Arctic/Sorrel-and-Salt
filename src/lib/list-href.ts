import type { Route } from 'next';
import type { ListDialog, ListDialogParams, ListHrefParams } from './types';

// The address of a list page under its filter, at a cursor, with a modal open
// over it or not: `/admin/users?query=wort&awaiting`. Every list's links,
// pager, filter submit and modal close build one, and six `href.ts` files each
// carried their own copy of this join until MB.115.
//
// Joined by hand rather than through `URLSearchParams`, which would write a
// bare flag such as `new` or `awaiting` as `new=`: the pages read those by
// their presence, and the bare form is the one a person sees in the address
// bar. Each name and value is still encoded by `URLSearchParams`.

const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();

/**
 * `path` with `params` as its query, in the order given: a string is a pair,
 * `true` a bare flag, and `undefined`, `false` or `''` is left out, so a blank
 * filter is written as none.
 */
export function listHref(path: string, params: ListHrefParams = {}): Route {
  const parts = Object.entries(params).flatMap(([name, value]) => {
    if (value === true) return [encodeURIComponent(name)];
    return value ? [pair(name, value)] : [];
  });
  return (parts.length ? `${path}?${parts.join('&')}` : path) as Route;
}

/**
 * The modal open over a list, as the two parameters its address carries,
 * spread into `listHref`'s params after the filter and cursor: `?new`, or
 * `?edit=<slug>`, or neither. Both names are always given, the absent one
 * as `false` or `undefined`, which `listHref` leaves out, so a caller
 * cannot write both.
 */
export function dialogParams(dialog?: ListDialog): ListDialogParams {
  return { new: dialog === 'new', edit: dialog === 'new' ? undefined : dialog?.edit };
}
