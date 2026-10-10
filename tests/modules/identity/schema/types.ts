/** One `admin_role_changes` row as the ledger tests read it, `change` cast to text. */
export interface LedgerRow {
  user_id: string;
  change: string;
  note: string | null;
  created_by: string;
  updated_by: string;
}

/** One `admin_role_change_pauses` row as the pause tests read it, `ended` for whether `ended_at` is set. */
export interface PauseRow {
  created_by: string;
  updated_by: string;
  ended_by: string | null;
  ended: boolean;
}

/** One `user_privilege_changes` row as the ledger tests read it, enums and timestamps cast to text. */
export interface PrivilegeChangeRow {
  id: string;
  user_id: string;
  privilege: string;
  change: string;
  via: string;
  note: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
  deleted_by: string | null;
}
