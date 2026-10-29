import { trimmed } from '../../../../../lib/search-params';
import { readListPlace } from '../../list-page';
import type { InvitationsPlace, InvitationsSearchParams } from './types';

/**
 * The tab's filter and page off its address: `email` trimmed (blank is none), `expiring` by
 * presence, and at most one cursor, as every admin list reads one (`readListPlace`).
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
