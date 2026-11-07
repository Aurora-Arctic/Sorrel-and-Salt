import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';
import type { WorkspaceRole } from '@/modules/coven';
import type { UpdatedStamp } from '../DataTable/types';

export interface MemberListEntry extends UpdatedStamp {
  userId: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: Date;
  invitedBy: string | null;
  email?: string | null;
  paused?: { until: Date | null } | null;
  openHref?: Route;
  heading?: ModalHeading;
}

export interface MemberListProps {
  members: readonly MemberListEntry[];
  currentUserId: string;
  showEmail?: boolean;
  showAccess?: boolean;
}

export interface RoleControlProps {
  workspaceId: string;
  userId: string;
  name: string;
  currentRole: WorkspaceRole;
  /** Asks over the member modal it sits in, rather than in a modal of its own; a refusal is still its callout. */
  inModal?: boolean;
}

export interface RemoveControlProps {
  workspaceId: string;
  userId: string;
  name: string;
  /** Asks over the member modal it sits in, rather than in a modal of its own. */
  inModal?: boolean;
  onSent?: () => void;
}

export interface MemberLinkProps {
  href: Route;
  heading: ModalHeading;
  name: string;
}
