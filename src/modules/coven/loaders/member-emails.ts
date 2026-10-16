import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { emailsOfMembers } from '../services/members';
import type { MemberKey } from '../types';

/**
 * `WorkspaceMember.email`, batched: the address of each member a request
 * lists, one read per coven. Keyed by the pair, since the service checks the
 * coven, and cached by it, since one person in two covens is two keys.
 */
export const memberEmailsByMember = defineSignedInLoader<MemberKey, string | null, string>(
  emailsOfMembers,
  { cacheKeyFn: ({ workspaceId, userId }) => `${workspaceId}:${userId}` },
);
