import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { membershipsOf } from '../services/memberships';
import type { MembershipWithWorkspace } from '../types';

/** `User.memberships`, batched: the covens of each user id loaded in one request. */
export const membershipsByUser = defineSignedInLoader<string, MembershipWithWorkspace[]>(
  membershipsOf,
);
