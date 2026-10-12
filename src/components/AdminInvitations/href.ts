import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminInvitationsCursor, AdminInvitationsFilter } from './types';

// The Invitations tab's address under its filter, at a page, with the invite
// form open over it or not (MB.115):
// `/admin/invitations?email=fern&expiring&after=…&invite`. `expiring` and
// `invite` are bare flags, read by their presence, as a value page's `?new`
// is. The pager, Invite Admin, the form's close and the filter's submit each
// build one: the pager and the form keep the filter, the form keeps the page
// too, and the filter's submit names no cursor, so it opens the first page.

/** The page itself, unfiltered: where the filter submits. */
export const INVITATIONS_PATH: Route = '/admin/invitations';

export function invitationsHref(
  { email, expiringSoon }: Partial<AdminInvitationsFilter> = {},
  { after, before }: AdminInvitationsCursor = {},
  invite = false,
): Route {
  return listHref(INVITATIONS_PATH, { email, expiring: expiringSoon, after, before, invite });
}
