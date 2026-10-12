import type { UserRole } from '../../lib/session';
import type { WorkspaceRole } from '@/modules/coven';

/** The user the modal is open on: what the body needs of the row. */
export interface UserDetailUser {
  id: string;
  name: string;
  role: UserRole;
}

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
