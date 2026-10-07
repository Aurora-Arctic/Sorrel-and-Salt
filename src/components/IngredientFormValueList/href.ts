import type { Route } from 'next';
import type { FormsDialog, FormsPlace } from './types';

// The address of `/admin/forms` under a filter, at a page, with a modal open
// over it or not: the list's links, the pager, the filter's submit and the
// modal's way back all build it. The page's own filter and cursor stay, so
// closing the modal lands where it was opened. A blank filter is written as
// none. `new` is a bare flag, read by its presence, as the categories page's
// is.

const PATH = '/admin/forms';

export function formsHref(place: FormsPlace, dialog?: FormsDialog): Route {
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(['query', 'group', 'after', 'before'] as const).flatMap((name) => {
      const value = place[name];
      return value ? [pair(name, value)] : [];
    }),
    ...(dialog === 'new' ? ['new'] : dialog ? [pair('edit', dialog.edit)] : []),
  ];
  return (parts.length ? `${PATH}?${parts.join('&')}` : PATH) as Route;
}
