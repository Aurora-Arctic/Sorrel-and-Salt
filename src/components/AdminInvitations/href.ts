import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminInvitationsFilter } from './types';

// The Invitations tab's address under its filter, with the invite form open
// over it or not (MB.115): `/admin/invitations?email=fern&expiring&invite`.
// `expiring` and `invite` are bare flags, read by their presence, as a value
// page's `?new` is. Invite Admin, the form's close and the filter's submit
// each build one, so opening and closing the form keeps the filter.

const PATH = '/admin/invitations';

export function invitationsHref(
  { email, expiringSoon }: Partial<AdminInvitationsFilter> = {},
  invite = false,
): Route {
  return listHref(PATH, { email, expiring: expiringSoon, invite });
}
