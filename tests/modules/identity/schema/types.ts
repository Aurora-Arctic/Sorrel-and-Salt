/** One `admin_role_changes` row as the ledger tests read it, `change` cast to text. */
export interface LedgerRow {
  user_id: string;
  change: string;
  note: string | null;
  created_by: string;
  updated_by: string;
}
