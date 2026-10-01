import { defineLoader } from '../../../graphql/loaders/define-loader';
import { Forbidden } from '../../../lib/errors';
import { membershipsOf } from '../services/memberships';
import type { MembershipWithWorkspace } from '../types';

/** `User.memberships`, batched: the covens of each user id loaded in one request. */
export const membershipsByUser = defineLoader<string, MembershipWithWorkspace[]>(
  async (session, userIds) =>
    session ? membershipsOf(session, userIds) : userIds.map(() => new Forbidden()),
);
