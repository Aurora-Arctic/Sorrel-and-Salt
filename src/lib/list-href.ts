import type { Route } from 'next';
import type {
  ListDialog,
  ListDialogParams,
  ListHrefParams,
  Page,
  PagerCursor,
  PagerHrefs,
} from './types';

// The address of a list page under its filter, at a cursor, with a modal open or not (`/keepers/users?query=wort&awaiting`). Joined by hand,
// not through `URLSearchParams`, which would write a bare flag such as `new` as `new=`; each name and value is still encoded by it.

const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();

export function listHref(path: string, params: ListHrefParams = {}): Route {
  const parts = Object.entries(params).flatMap(([name, value]) => {
    if (value === true) return [encodeURIComponent(name)];
    if (Array.isArray(value)) return value.filter(Boolean).map((each) => pair(name, each));
    return typeof value === 'string' && value ? [pair(name, value)] : [];
  });
  return (parts.length ? `${path}?${parts.join('&')}` : path) as Route;
}

/** Both names are always given, the absent one `false` or `undefined`, so a caller cannot write both. */
export function dialogParams(dialog?: ListDialog): ListDialogParams {
  return { new: dialog === 'new', edit: dialog === 'new' ? undefined : dialog?.edit };
}

/** Pure, so a client list and a server page can both call it. */
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

export function withParam(href: string, name: string, value: string): Route {
  return `${href}${href.includes('?') ? '&' : '?'}${pair(name, value)}` as Route;
}
