import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PagerCursor } from '../../lib/types';
import type { UserListFilterValue } from './types';

// The address of `/admin/users` under a filter, at a cursor, with a user's
// modal open over it or not: the page's pager, the filter's submit,
// each row's name, the modal's close and each privilege-ledger row's link
// build it. The pager and the filter leave `user` out, so they close the
// modal as every list's drop `?edit=`.
// `awaiting` is a bare flag, read by its presence, which `listHref` writes bare.

/** The page itself, unfiltered: where the filter submits. */
export const USERS_PATH: Route = '/admin/users';

export function userListHref(
  { query, awaitingApproval, role }: UserListFilterValue,
  cursor?: PagerCursor,
  user?: string,
): Route {
  return listHref(USERS_PATH, { query, awaiting: awaitingApproval, role, ...cursor, user });
}
