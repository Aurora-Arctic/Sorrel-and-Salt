import type { Route } from 'next';
import { dialogParams, listHref } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import type { GroupKind } from '../GroupForm/types';
import { KINDS } from './kinds';
import type { GroupsPlace } from './types';

export function groupsHref(kind: GroupKind, place: GroupsPlace, dialog?: ListDialog): Route {
  return listHref(KINDS[kind].path, {
    query: place.query,
    after: place.after,
    before: place.before,
    ...dialogParams(dialog),
  });
}
