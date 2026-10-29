import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { emailsOfMembers } from '../services/members';
import type { MemberKey } from '../types';

/** `WorkspaceMember.email`, batched: one read per coven, keyed and cached by the (coven, member) pair. */
export const memberEmailsByMember = defineSignedInLoader<MemberKey, string | null, string>(
  emailsOfMembers,
  { cacheKeyFn: ({ workspaceId, userId }) => `${workspaceId}:${userId}` },
);
