import type { ReactNode } from 'react';
import type { WorkspaceRole } from '@/modules/coven';

/** One listed member: who they are, what they may do here, and when they joined. */
export interface MemberListEntry {
  /** The user's id, which the row is keyed by and `currentUserId` is matched against. */
  userId: string;
  /** The display name, `WorkspaceMember.user.name`. */
  name: string;
  role: WorkspaceRole;
  joinedAt: Date;
  /** Who last changed the membership, by display name (`updatedBy` resolved); null when the name is withheld, and then `updatedAt` is null too. */
  updatedBy: string | null;
  /** When the membership last changed: a role change moves it, the joining date does not. */
  updatedAt: Date | null;
}

export interface MemberListProps {
  /** This page's members, in the order the service read them. */
  members: readonly MemberListEntry[];
  /** The signed-in user, whose own row is marked "You". */
  currentUserId: string;
  /**
   * The role change beside each role — Promote, Demote — given the member it
   * is for; it may return nothing for a row with none. When absent, the Role
   * column holds the role alone.
   */
  roleAction?: (member: MemberListEntry) => ReactNode;
  /**
   * The removal at the end of each row, in a column of its own — Remove —
   * given the member it is for. When absent, the list has no such column,
   * which is how a member who cannot remove anyone sees it.
   */
  removeAction?: (member: MemberListEntry) => ReactNode;
}

/** The role change a member's row offers an owner (M6.13). */
export interface RoleControlProps {
  workspaceId: string;
  /** The member the change is for. */
  userId: string;
  name: string;
  direction: 'promote' | 'demote';
  /** The roles the member may move to, nearest their own first; the first is chosen to start. */
  options: readonly [WorkspaceRole, ...WorkspaceRole[]];
}

export interface RoleFailureProps {
  children: ReactNode;
}

/** The removal a member's row offers an owner (M6.15). */
export interface RemoveControlProps {
  workspaceId: string;
  /** The member to remove. */
  userId: string;
  name: string;
}
