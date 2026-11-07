import type { Route } from 'next';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** A site role an invitation may grant: never `user`, which every account holds. */
export type InvitableSiteRole = 'curator' | 'admin';

export interface AdminInvitationEntry {
  id: string;
  email: string;
  siteRole: InvitableSiteRole;
  note: string | null;
  expiresAt: Date;
}

export interface AdminInvitationsFilter {
  email: string;
  expiringSoon: boolean;
}

export interface AdminInvitationsCursor {
  after?: string;
  before?: string;
}

export interface AdminInvitationsProps extends Partial<PagerHrefs<Route>> {
  invitations: AdminInvitationEntry[];
  filter?: AdminInvitationsFilter;
  cursor?: AdminInvitationsCursor;

  position?: PagePosition;
  locked?: string;
  /** Whether the address opens the invite form, `?invite`; never while locked. */
  inviting?: boolean;
}

export interface InviteAdminProps {
  locked?: string;
  filter?: AdminInvitationsFilter;
  cursor?: AdminInvitationsCursor;
}

export interface AdminInvitationsFilterProps {
  filter: AdminInvitationsFilter;
}

export interface InviteFormProps {
  open: boolean;
  closeHref: Route;
  onSent: (address: string) => void;
}

export interface InviteFieldsProps extends Pick<InviteFormProps, 'onSent'> {
  close: () => void;
}

export interface RevokeInvitationProps {
  invitation: AdminInvitationEntry;
  locked?: string;
}
