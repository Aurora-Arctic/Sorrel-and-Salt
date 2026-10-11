import type { AdminInvitationsFilter } from '../../../../components/AdminInvitations/types';
import { single } from '../../../../lib/search-params';
import type { InvitationsSearchParams } from './types';

/**
 * The tab's filter off its address (MB.115), which the page and Invite Admin
 * beside the heading both read: `email` trimmed, blank as none, as a native
 * submit sends `email=`; and `expiring` by its presence, a native submit's
 * `expiring=` read the same as the bare flag.
 */
export function readInvitationsFilter(params: InvitationsSearchParams): AdminInvitationsFilter {
  return {
    email: single(params.email)?.trim() ?? '',
    expiringSoon: params.expiring !== undefined,
  };
}
