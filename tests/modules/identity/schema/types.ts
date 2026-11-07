export interface PauseRow {
  created_by: string;
  updated_by: string;
  ended_by: string | null;
  ended: boolean;
}

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
