export interface EmailUserRow {
  id: string;
  email: string;
  email_verified: boolean;
  updated_by: string;
  updated_at: Date;
  verification_sent_at: Date | null;
}

export interface ProvisionalUserRow {
  id: string;
  email_verified: boolean;
  updated_by: string;
  updated_at: Date;
}

export interface ListedUserRow {
  id: string;
  name: string;
}

export interface CreationFlagRow {
  can_create_workspace: boolean;
  updated_by: string;
  updated_at: Date;
}

/** One `create_workspace` row of `user_privilege_changes` as the ledger tests read it, the enums cast to text. */
export interface CreationChangeRow {
  user_id: string;
  change: string;
  via: string;
  created_by: string;
  updated_by: string;
}

/** One `user_privilege_changes` row as the role tests read it, the enums cast to text. */
export interface PrivilegeChangeRow {
  user_id: string;
  privilege: string;
  change: string;
  via: string;
  note: string | null;
  created_by: string;
  created_at: Date;
}

export interface RoleRow {
  role: string;
  can_create_workspace: boolean;
  updated_by: string;
}

/** One ledger row as the privilege-change tests seed and read it back, in the service's order. */
export interface LedgerRow {
  id: string;
  user_id: string;
  privilege: string;
}

/** One `admin_role_change_pauses` row as the pause tests read it. */
export interface PauseRow {
  created_by: string;
  updated_by: string;
  ended_by: string | null;
  ended: boolean;
}

/** A user's name and its stamps, as the name tests read them. */
export interface NamedUserRow {
  id: string;
  name: string;
  updated_by: string;
  updated_at: Date;
}

/** One `invitations` row as the invitation tests read it, the role cast to text. */
export interface InvitationStateRow {
  id: string;
  workspace_id: string | null;
  role: string | null;
  email: string;
  token_hash: string;
  note: string | null;
  accepted_at: Date | null;
  accepted_by?: string | null;
  revoked_at: Date | null;
  expires_at: Date;
  created_by: string;
  updated_by: string;
}

/** How an acceptance test shapes the invitation it inserts. */
export interface InvitationFixture {
  email?: string;
  token?: string;
  createdBy?: string;
  note?: string | null;
  workspaceId?: string | null;
  role?: 'viewer' | 'member' | null;
  expired?: boolean;
  revoked?: boolean;
  accepted?: boolean;
}
