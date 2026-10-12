/** One `invitations` row as the coven invitation tests read it, the enum cast to text. */
export interface CovenInvitationStateRow {
  id: string;
  workspace_id: string | null;
  role: string | null;
  email: string;
  token_hash: string;
  accepted_at: Date | null;
  revoked_at: Date | null;
  expires_at: Date;
  created_by: string;
  updated_by: string;
}
