/** One pending admin invitation, as `/admin/invitations` lists it (MB.70). */
export interface AdminInvitationEntry {
  id: string;
  email: string;
  /** Why the person is invited, where the inviting admin gave a reason. */
  note: string | null;
  expiresAt: Date;
}

export interface AdminInvitationsProps {
  /** The pending invitations, newest first. */
  invitations: AdminInvitationEntry[];
  /**
   * Why this admin may neither invite nor withdraw, while admin changes are
   * paused and they are not the primary admin (MB.63); absent when they may.
   */
  locked?: string;
  /** Whether the address opens the invite form, `?invite`; never while locked. */
  inviting?: boolean;
}

export interface InviteAdminProps {
  /** Why Invite Admin is locked, while admin changes are paused; absent when it is not. */
  locked?: string;
}

export interface InviteFormProps {
  /** Told the address an invitation was sent to, before the form closes. */
  onSent: (address: string) => void;
}
