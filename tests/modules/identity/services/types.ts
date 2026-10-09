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

/** One `workspace_creation_changes` row as the ledger tests read it, `change` cast to text. */
export interface CreationChangeRow {
  user_id: string;
  change: string;
  created_by: string;
  updated_by: string;
}
