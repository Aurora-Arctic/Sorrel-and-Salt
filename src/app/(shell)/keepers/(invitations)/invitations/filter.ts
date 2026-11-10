import { trimmed } from '../../../../../lib/search-params';
import { readListPlace } from '../../../curator/list-page';
import type { InvitationsPlace, InvitationsSearchParams } from './types';

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
