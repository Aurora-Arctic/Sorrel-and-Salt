import { trimmed } from '@/lib/search-params';
import { readListPlace } from '@/app/(shell)/_admin/list-page';
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
