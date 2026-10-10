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

/** One ledger row as the privilege-change tests seed and read it back, in the service's order. */
export interface LedgerRow {
  id: string;
  user_id: string;
  privilege: string;
}
