import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PagerCursor } from '../../app/admin/types';
import type { UserListFilterValue } from './types';

// The address of `/admin/users` under a filter, at a cursor: the page's pager,
// the filter's submit and each privilege-ledger row's link build it.
// `awaiting` is a bare flag, read by its presence (MB.53, on the owner's
// word), which `listHref` writes bare.

/** The page itself, unfiltered: where the filter submits. */
export const USERS_PATH: Route = '/admin/users';

export function userListHref(
  { query, awaitingApproval, role }: UserListFilterValue,
  cursor?: PagerCursor,
): Route {
  return listHref(USERS_PATH, { query, awaiting: awaitingApproval, role, ...cursor });
}
