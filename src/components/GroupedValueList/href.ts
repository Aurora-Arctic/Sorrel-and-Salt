import type { Route } from 'next';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { KINDS } from './kinds';
import type { GroupedValuesDialog, GroupedValuesPlace } from './types';

// The address of a grouped vocabulary's admin page under a filter, at a page,
// with a modal open over it or not: the list's links, the pager, the filter's
// submit and the modal's way back all build it. The page's own filter and
// cursor stay, so closing the modal lands where it was opened. A blank filter
// is written as none, and the group under the kind's own parameter. `new` is
// a bare flag, read by its presence, as the user list's `awaiting`.

export function groupedValuesHref(
  kind: GroupedValueKind,
  place: GroupedValuesPlace,
  dialog?: GroupedValuesDialog,
): Route {
  const { path, groupParam } = KINDS[kind];
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(['query', 'group', 'after', 'before'] as const).flatMap((name) => {
      const value = place[name];
      return value ? [pair(name === 'group' ? groupParam : name, value)] : [];
    }),
    ...(dialog === 'new' ? ['new'] : dialog ? [pair('edit', dialog.edit)] : []),
  ];
  return (parts.length ? `${path}?${parts.join('&')}` : path) as Route;
}
