import { trimmed } from '../../../../../lib/search-params';
import { readListPlace } from '../../list-page';
import type { InvitationsPlace, InvitationsSearchParams } from './types';

/**
 * The tab's filter and page off its address, which the page and
 * New Invitation beside the heading both read: `email` trimmed, blank as none,
 * as a native submit sends `email=`; `expiring` by its presence, a native
 * submit's `expiring=` read the same as the bare flag; and at most one
 * cursor, read as every admin list reads one (`readListPlace`).
 */
export function readInvitationsPlace(params: InvitationsSearchParams): InvitationsPlace {
  const { after, before } = readListPlace(params);
  return {
    filter: {
      email: trimmed(params.email),
      expiringSoon: params.expiring !== undefined,
    },
    cursor: { after, before },
  };
}
