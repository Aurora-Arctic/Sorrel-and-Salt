import type { SupportAbout, SupportStatus } from '../SupportRequests/types';

export interface SupportSenderReply {
  id: string;
  body: string;
  createdAt: Date;
  /** The sender wrote it; otherwise staff did, and no staff name is carried. */
  fromSender: boolean;
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
  /** Oldest first, public only: an internal note is never read or carried. */
  replies: readonly SupportSenderReply[];
  /** The request opened as a follow-up to this one once it closed, if any. */
  followUpId: string | null;
  /** The sender's standing time-out and its end, null for one with no end date; null with none in force. */
  timedOut: { until: Date | null } | null;
}

export interface SupportSenderRequestProps {
  request: SupportSenderRequestEntry;
}

export interface SupportSenderReplyBoxProps {
  requestId: string;
  timedOut: { until: Date | null } | null;
}
