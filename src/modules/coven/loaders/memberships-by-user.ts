import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { membershipsOf } from '../services/memberships';
import type { MembershipWithWorkspace } from '../types';

export const membershipsByUser = defineSignedInLoader<string, MembershipWithWorkspace[]>(
  membershipsOf,
);
