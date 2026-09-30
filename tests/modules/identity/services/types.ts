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
