import type { Route } from 'next';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** A site role an invitation may grant: never `user`, which every account holds. */
export type InvitableSiteRole = 'curator' | 'admin';

/** One pending admin invitation, as `/admin/invitations` lists it. */
export interface AdminInvitationEntry {
  id: string;
  email: string;
  /** The site role it grants once accepted. */
  siteRole: InvitableSiteRole;
  /** Why the person is invited, where the inviting admin gave a reason. */
  note: string | null;
  expiresAt: Date;
}

/** What the tab is narrowed by, as its address carries it. */
export interface AdminInvitationsFilter {
  /** A fragment of the invited address, trimmed; blank is no filter. */
  email: string;
  /** Only the invitations lapsing within the next 24 hours: Expires in 24 Hrs. */
  expiringSoon: boolean;
}

/** The page of the list the address shows, by the cursor it turned on; none for the first. */
export interface AdminInvitationsCursor {
  after?: string;
  before?: string;
}

export interface AdminInvitationsProps extends Partial<PagerHrefs<Route>> {
  /** This page of the pending invitations the filter leaves, newest first. */
  invitations: AdminInvitationEntry[];
  /** The filter the page shows; none when left out. */
  filter?: AdminInvitationsFilter;
  /** The page shown, which the invite form closes back to; the first when left out. */
  cursor?: AdminInvitationsCursor;

  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
  /**
   * Why this admin may neither invite nor withdraw, while admin changes are paused
   * and they are not the primary admin; absent when they may.
   */
  locked?: string;
  /** Whether the address opens the invite form, `?invite`; never while locked. */
  inviting?: boolean;
}

export interface InviteAdminProps {
  /** Why New Invitation is locked, while admin changes are paused; absent when it is not. */
  locked?: string;
  /** The filter the tab shows, which the form opens over; none when left out. */
  filter?: AdminInvitationsFilter;
  /** The page the tab shows, which the form opens over; the first when left out. */
  cursor?: AdminInvitationsCursor;
}

/** The filter's fields, starting from the filter the page shows. */
export interface AdminInvitationsFilterProps {
  filter: AdminInvitationsFilter;
}

export interface InviteFormProps {
  /** `?invite` is open and invitations are not locked: the form shows. */
  open: boolean;
  /** The tab under the filter it shows, which the form closes back to. */
  closeHref: Route;
  /** Told the address an invitation was sent to, before the form closes. */
  onSent: (address: string) => void;
}

/** The invite form inside its modal, given the modal's own close. */
export interface InviteFieldsProps extends Pick<InviteFormProps, 'onSent'> {
  /** The modal's close, unguarded: a sent invitation goes at once. */
  close: () => void;
}

/** A row's Revoke: the invitation it withdraws, and why it is locked, if it is. */
export interface RevokeInvitationProps {
  invitation: AdminInvitationEntry;
  /** Why this admin may not revoke, while admin changes are paused; absent when they may. */
  locked?: string;
}
