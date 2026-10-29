import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PagerCursor } from '../../lib/types';
import type { UserListFilterValue } from './types';

// The address of `/admin/users` under a filter and cursor, with a user's modal open or not. The
// pager and filter leave `user` out, closing the modal as every list's drop `?edit=`. `awaiting` is
// a bare flag, read by its presence.

/** The page itself, unfiltered: where the filter submits. */
export const USERS_PATH: Route = '/admin/users';

export function userListHref(
  { query, awaitingApproval, role }: UserListFilterValue,
  cursor?: PagerCursor,
  user?: string,
): Route {
  return listHref(USERS_PATH, { query, awaiting: awaitingApproval, role, ...cursor, user });
}
