import type { WorkspaceRole } from '@/modules/coven';
import type { UserListEntry } from '../UserList/types';

/**
 * The user the modal is open on: the row's own facts, which the body shows
 * again in full (the owner's call), and what Impersonate needs. One
 * definition with the list's, so a fact added to the table reaches the modal.
 */
export type UserDetailUser = Pick<
  UserListEntry,
  | 'id'
  | 'name'
  | 'email'
  | 'emailVerified'
  | 'role'
  | 'primaryAdmin'
  | 'canCreateWorkspace'
  | 'providers'
  | 'createdAt'
>;

/** One live coven the user belongs to, as the service answered it. */
export interface UserCoven {
  workspaceId: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface UserDetailProps {
  user: UserDetailUser;
  memberships: readonly UserCoven[];
  /** Whether impersonation is registered here (MB.53); off by default. */
  canImpersonate?: boolean;
}
