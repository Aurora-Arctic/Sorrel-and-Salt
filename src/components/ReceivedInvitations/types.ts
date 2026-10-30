import type { WorkspaceRole } from '@/modules/coven';
import type { PagePosition } from '../../lib/types';

/** One coven invitation addressed to the signed-in account, as the landing lists it. */
export interface ReceivedInvitationEntry {
  id: string;
  covenName: string;
  covenSlug: string;
  /** The role accepting grants; never an owner. */
  role: WorkspaceRole;
  /** Who sent it; absent when that account is gone. */
  inviterName: string | null;
  expiresAt: Date;
  /** The sender's note, as written. */
  note: string | null;
}

export interface ReceivedInvitationsProps {
  /** The pager's ends; one with no page beyond it is left out. */
  previousHref?: string;
  nextHref?: string;
  /** This page of the invitations, in the order the service pages them. */
  invitations: readonly ReceivedInvitationEntry[];
  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
}

/** A row's Accept: the invitation it takes up and the coven it lands in. */
export interface AcceptControlProps {
  invitation: Pick<ReceivedInvitationEntry, 'id' | 'covenName' | 'covenSlug'>;
}
