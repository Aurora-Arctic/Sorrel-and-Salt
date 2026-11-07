import type { PagePosition } from '../../lib/types';
import type { WorkspaceRole } from '@/modules/coven';

export interface PendingInvitationEntry {
  id: string;
  email: string;
  /** The role the invitation grants; never a steward. */
  role: WorkspaceRole;
  expiresAt: Date;
  /** When the invitee declined it, from their account page; `null` while it is pending. */
  declinedAt: Date | null;
}

export interface PendingInvitationsProps {
  previousHref?: string;
  nextHref?: string;
  workspaceId: string;
  invitations: readonly PendingInvitationEntry[];
  position?: PagePosition;
}

export interface RevokeControlProps {
  workspaceId: string;
  invitation: Pick<PendingInvitationEntry, 'id' | 'email'>;
}
