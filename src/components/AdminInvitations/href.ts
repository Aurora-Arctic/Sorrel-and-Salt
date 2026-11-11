import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminInvitationsCursor, AdminInvitationsFilter } from './types';

export const INVITATIONS_PATH: Route = '/keepers/invitations';

export const NO_INVITATIONS_FILTER: AdminInvitationsFilter = { email: '', expiringSoon: false };

export function invitationsHref(
  { email, expiringSoon }: Partial<AdminInvitationsFilter> = {},
  { after, before }: AdminInvitationsCursor = {},
  invite = false,
): Route {
  return listHref(INVITATIONS_PATH, { email, expiring: expiringSoon, after, before, invite });
}
