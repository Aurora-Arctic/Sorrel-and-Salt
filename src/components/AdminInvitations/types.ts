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
}
