import type { Route } from 'next';
import { dialogParams, listHref } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { KINDS } from './kinds';
import type { GroupedValuesPlace } from './types';

// The address of a curated vocabulary's admin page under a filter, at a page, with a modal open or not.
// Filter and cursor stay, so closing the modal lands where it was opened; a blank filter is written as
// none. `new` is a bare flag, read by its presence (src/lib/list-href.ts).

export function groupedValuesHref(
  kind: GroupedValueKind,
  { query, group, after, before }: GroupedValuesPlace,
  dialog?: ListDialog,
): Route {
  const { path, group: groupSpec } = KINDS[kind];
  return listHref(path, {
    query,
    // A flat kind has no group to write.
    ...(groupSpec ? { [groupSpec.param]: group } : {}),
    after,
    before,
    ...dialogParams(dialog),
  });
}
