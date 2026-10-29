import type { ReactNode } from 'react';
import type { WorkspaceRole } from '@/modules/coven';
import type { UpdatedStamp } from '../DataTable/types';

/** One listed member: who they are, what they may do here, and when they joined. */
export interface MemberListEntry extends UpdatedStamp {
  /** The user's id, which the row is keyed by and `currentUserId` is matched against. */
  userId: string;
  /** The display name, `WorkspaceMember.user.name`. */
  name: string;
  role: WorkspaceRole;
  joinedAt: Date;
  // `updatedBy` is who last changed the membership, `updatedAt` when: a role change moves it, the
  // joining date does not.
  /** Who invited them, by display name; null for a coven's creator, or when the name is withheld. */
  invitedBy: string | null;
  /** Their address, which the page reads for an owner alone. */
  email?: string | null;
}

export interface MemberListProps {
  /** This page's members, in the order the service read them. */
  members: readonly MemberListEntry[];
  /** The signed-in user, whose own row is marked "You". */
  currentUserId: string;
  /**
   * Whether to draw the Email column, which the page sets for an owner alone. When absent,
   * the list has no such column.
   */
  showEmail?: boolean;
  /**
   * The role change beside each role — Change Role — given the member it
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

/** The role change a member's row offers an owner. */
export interface RoleControlProps {
  workspaceId: string;
  /** The member the change is for. */
  userId: string;
  name: string;
  /** The role they hold now, which is left out of the choices. */
  currentRole: WorkspaceRole;
}

/** The removal a member's row offers an owner. */
export interface RemoveControlProps {
  workspaceId: string;
  /** The member to remove. */
  userId: string;
  name: string;
}
