import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { UserListFilterValue } from './types';

// The address of `/admin/users` under a filter, at a cursor: the page's pager,
// the filter's submit and each privilege-ledger row's link build it.
// `awaiting` is a bare flag, read by its presence (MB.53, on the owner's
// word), which `listHref` writes bare.

const PATH = '/admin/users';

export function userListHref(
  { query, awaitingApproval, role }: UserListFilterValue,
  cursor: Readonly<Record<string, string>> = {},
): Route {
  return listHref(PATH, { query, awaiting: awaitingApproval, role, ...cursor });
}
