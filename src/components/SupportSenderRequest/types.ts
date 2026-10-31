import type { SupportAbout, SupportStatus } from '../SupportRequests/types';

export interface SupportSenderReply {
  id: string;
  body: string;
  createdAt: Date;
}

/** One request of the signed-in sender, opened: what they sent and the replies, with no staff name on any. */
export interface SupportSenderRequestEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  status: SupportStatus;
  message: string;
  createdAt: Date;
  path: string | null;
  errorCode: number | null;
  errorReference: string | null;
  /** Oldest first. */
  replies: readonly SupportSenderReply[];
}

export interface SupportSenderRequestProps {
  request: SupportSenderRequestEntry;
}
