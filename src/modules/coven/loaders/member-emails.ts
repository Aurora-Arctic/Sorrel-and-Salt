import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { emailsOfMembers } from '../services/members';
import type { MemberKey } from '../types';

export const memberEmailsByMember = defineSignedInLoader<MemberKey, string | null, string>(
  emailsOfMembers,
  { cacheKeyFn: ({ workspaceId, userId }) => `${workspaceId}:${userId}` },
);
