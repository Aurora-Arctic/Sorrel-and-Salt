import type { Route } from 'next';
import { dialogParams, listHref } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { KINDS } from './kinds';
import type { GroupedValuesPlace } from './types';

export function groupedValuesHref(
  kind: GroupedValueKind,
  { query, group, after, before }: GroupedValuesPlace,
  dialog?: ListDialog,
): Route {
  const { path, group: groupSpec } = KINDS[kind];
  return listHref(path, {
    query,
    ...(groupSpec ? { [groupSpec.param]: group } : {}),
    after,
    before,
    ...dialogParams(dialog),
  });
}
