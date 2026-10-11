import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { KINDS } from './kinds';
import type { GroupedValuesDialog, GroupedValuesPlace } from './types';

// The address of a curated vocabulary's admin page under a filter, at a
// page, with a modal open over it or not: the list's links, the pager, the
// filter's submit and the modal's way back all build it. The page's own
// filter and cursor stay, so closing the modal lands where it was opened. A
// blank filter is written as none, and the group under the kind's own
// parameter. `new` is a bare flag, read by its presence (src/lib/list-href.ts).

export function groupedValuesHref(
  kind: GroupedValueKind,
  { query, group, after, before }: GroupedValuesPlace,
  dialog?: GroupedValuesDialog,
): Route {
  const { path, group: groupSpec } = KINDS[kind];
  return listHref(path, {
    query,
    // A flat kind has no group to write.
    ...(groupSpec ? { [groupSpec.param]: group } : {}),
    after,
    before,
    new: dialog === 'new',
    edit: dialog === 'new' ? undefined : dialog?.edit,
  });
}
