import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';
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
  /** Their address, which the page reads for a steward alone. */
  email?: string | null;
  /** The pause standing on their access to the coven, with its end or null for none; read for a steward alone. */
  paused?: { until: Date | null } | null;
  /** The address of their modal over the list, the cursor kept; the name links there when given. */
  openHref?: Route;
  /** The modal's head, shown at once on a press and kept as the body arrives. */
  heading?: ModalHeading;
}

export interface MemberListProps {
  /** This page's members, in the order the service read them. */
  members: readonly MemberListEntry[];
  /** The signed-in user, whose own row is marked "You". */
  currentUserId: string;
  /**
   * Whether to draw the Email column, which the page sets for a steward alone. When absent,
   * the list has no such column.
   */
  showEmail?: boolean;
  /**
   * Whether to draw the Access column, a standing pause's badge and end from each entry's `paused`, which the page sets
   * for a steward alone. When absent, the list has no such column.
   */
  showAccess?: boolean;
}

/** The role change the member modal offers a steward. */
export interface RoleControlProps {
  workspaceId: string;
  /** The member the change is for. */
  userId: string;
  name: string;
  /** The role they hold now, which is left out of the choices. */
  currentRole: WorkspaceRole;
  /** Asks over the member modal it sits in, rather than in a modal of its own; a refusal is still its callout. */
  inModal?: boolean;
}

/** The removal the member modal offers a steward. */
export interface RemoveControlProps {
  workspaceId: string;
  /** The member to remove. */
  userId: string;
  name: string;
  /** Asks over the member modal it sits in, rather than in a modal of its own. */
  inModal?: boolean;
  /** Called once the member is removed, in place of reading the page again; the member modal closes through it. */
  onSent?: () => void;
}

/** A row's name, linking to the member's modal. */
export interface MemberLinkProps {
  href: Route;
  /** The modal's head, shown at once on a press. */
  heading: ModalHeading;
  name: string;
}
