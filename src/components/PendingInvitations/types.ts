import type { PagePosition } from '../../lib/types';
import type { WorkspaceRole } from '@/modules/coven';

/** One open invitation of a coven, as the members page lists it: pending, or declined and not yet removed. */
export interface PendingInvitationEntry {
  id: string;
  email: string;
  /** The role the invitation grants; never an owner. */
  role: WorkspaceRole;
  expiresAt: Date;
  /** When the invitee declined it, from their account page; `null` while it is pending. */
  declinedAt: Date | null;
}

export interface PendingInvitationsProps {
  /** The pager's ends; one with no page beyond it is left out. */
  previousHref?: string;
  nextHref?: string;
  /** The coven the invitations are for, which Revoke sends with the id. */
  workspaceId: string;
  /** This page of the pending invitations, newest first. */
  invitations: readonly PendingInvitationEntry[];
  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
}

/** A row's Revoke, or a declined row's Remove: the invitation it stamps. */
export interface RevokeControlProps {
  workspaceId: string;
  invitation: Pick<PendingInvitationEntry, 'id' | 'email'>;
}
