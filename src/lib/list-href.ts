import type { Route } from 'next';
import type {
  ListDialog,
  ListDialogParams,
  ListHrefParams,
  Page,
  PagerCursor,
  PagerHrefs,
} from './types';

// The address of a list page under its filter, at a cursor, with a modal open or not (`/admin/users?query=wort&awaiting`). Joined by hand,
// not through `URLSearchParams`, which would write a bare flag such as `new` as `new=`; each name and value is still encoded by it.

const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();

/**
 * `path` with `params` as its query, in the order given: a string is a pair, a
 * list one pair per value, `true` a bare flag, and `undefined`, `false` or `''` is left out, so a blank
 * filter is written as none.
 */
export function listHref(path: string, params: ListHrefParams = {}): Route {
  const parts = Object.entries(params).flatMap(([name, value]) => {
    if (value === true) return [encodeURIComponent(name)];
    // A list is a repeated parameter, `forms=Herb&forms=Oil`, which `list` reads back.
    if (Array.isArray(value)) return value.filter(Boolean).map((each) => pair(name, each));
    return typeof value === 'string' && value ? [pair(name, value)] : [];
  });
  return (parts.length ? `${path}?${parts.join('&')}` : path) as Route;
}

/**
 * The modal open over a list as the two parameters its address carries (`?new`, `?edit=<slug>`, or neither), spread into `listHref`'s
 * params. Both names are always given, the absent one `false` or `undefined`, so a caller cannot write both.
 */
export function dialogParams(dialog?: ListDialog): ListDialogParams {
  return { new: dialog === 'new', edit: dialog === 'new' ? undefined : dialog?.edit };
}

/**
 * The pager's Prev and Next for a page, each built by `build` from the cursor it turns on, keeping the filter and dropping any modal. An end with
 * no page beyond it is left out. Pure, so a client list and a server page can both call it.
 */
export function pagerHrefs<Href extends string>(
  pageInfo: Page<unknown>['pageInfo'],
  build: (cursor: PagerCursor) => Href,
): PagerHrefs<Href> {
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = pageInfo;
  return {
    previousHref: hasPreviousPage && startCursor ? build({ before: startCursor }) : undefined,
    nextHref: hasNextPage && endCursor ? build({ after: endCursor }) : undefined,
  };
}

/**
 * `href` with one more pair on its query, so a dialog or notice opened over a filtered list keeps the
 * filter: `?` when `href` has no query yet, `&` after one.
 */
export function withParam(href: string, name: string, value: string): Route {
  return `${href}${href.includes('?') ? '&' : '?'}${pair(name, value)}` as Route;
}
