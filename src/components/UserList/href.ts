import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PagerCursor } from '../../lib/types';
import type { UserListFilterValue } from './types';

// The address of `/admin/users` under a filter and cursor, with a user's modal open or not. The
// pager and filter leave `user` out, closing the modal as every list's drop `?edit=`. `awaiting` is
// a bare flag, read by its presence.

/** The page itself, unfiltered: where the filter submits. */
export const USERS_PATH: Route = '/admin/users';

/**
 * The screens that open a user's modal over the Users list and take the close back: the key is the
 * `from` parameter, the value where Close goes. A fixed set, so the parameter is never an address of the caller's choosing.
 */
export const USER_MODAL_ORIGINS = {
  'invitation-cards': '/admin/invitation-cards',
} as const satisfies Record<string, Route>;

export type UserModalOrigin = keyof typeof USER_MODAL_ORIGINS;

export function userListHref(
  { query, awaitingApproval, role }: UserListFilterValue,
  cursor?: PagerCursor,
  user?: string,
  from?: UserModalOrigin,
): Route {
  return listHref(USERS_PATH, { query, awaiting: awaitingApproval, role, ...cursor, user, from });
}
