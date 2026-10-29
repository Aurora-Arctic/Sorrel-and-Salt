import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminInvitationsCursor, AdminInvitationsFilter } from './types';

// The Invitations tab's address under its filter and page, with the invite form open or not:
// `/admin/invitations?email=fern&expiring&after=…&invite`, `expiring` and `invite` being bare flags. The
// pager and form keep the filter, the form keeps the page, and the filter's submit names no cursor.

/** The page itself, unfiltered: where the filter submits. */
export const INVITATIONS_PATH: Route = '/admin/invitations';

export function invitationsHref(
  { email, expiringSoon }: Partial<AdminInvitationsFilter> = {},
  { after, before }: AdminInvitationsCursor = {},
  invite = false,
): Route {
  return listHref(INVITATIONS_PATH, { email, expiring: expiringSoon, after, before, invite });
}
