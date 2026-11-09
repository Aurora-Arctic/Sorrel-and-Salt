export interface EmailUserRow {
  id: string;
  email: string;
  email_verified: boolean;
  updated_by: string;
  updated_at: Date;
  verification_sent_at: Date | null;
  pending_email: string | null;
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

export interface CreationChangeRow {
  user_id: string;
  change: string;
  via: string;
  created_by: string;
  updated_by: string;
}

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

export interface LedgerRow {
  id: string;
  user_id: string;
  privilege: string;
}

export interface PauseRow {
  created_by: string;
  updated_by: string;
  ended_by: string | null;
  ended: boolean;
}

export interface NamedUserRow {
  id: string;
  name: string;
  updated_by: string;
  updated_at: Date;
}

export interface InvitationStateRow {
  id: string;
  workspace_id: string | null;
  role: string | null;
  site_role?: string | null;
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

export interface InvitationFixture {
  email?: string;
  token?: string;
  createdBy?: string;
  note?: string | null;
  workspaceId?: string | null;
  role?: 'viewer' | 'member' | null;
  /** The site role a site-tier invitation grants; `admin` by default there, none on a coven's. */
  siteRole?: 'user' | 'curator' | 'admin' | null;
  expired?: boolean;
  revoked?: boolean;
  accepted?: boolean;
  card?: boolean;
}
