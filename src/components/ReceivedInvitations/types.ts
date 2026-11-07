import type { WorkspaceRole } from '@/modules/coven';
import type { PagePosition } from '../../lib/types';

export interface ReceivedInvitationEntry {
  id: string;
  covenName: string;
  covenSlug: string;
  /** The role accepting grants; never a steward. */
  role: WorkspaceRole;
  inviterName: string | null;
  expiresAt: Date;
  note: string | null;
}

export interface ReceivedInvitationsProps {
  previousHref?: string;
  nextHref?: string;
  invitations: readonly ReceivedInvitationEntry[];
  position?: PagePosition;
}

export interface AcceptControlProps {
  invitation: Pick<ReceivedInvitationEntry, 'id' | 'covenName' | 'covenSlug'>;
}
