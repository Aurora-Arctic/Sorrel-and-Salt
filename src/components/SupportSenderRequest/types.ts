import type { ReactNode } from 'react';
import type { SupportAbout, SupportStatus } from '../SupportRequests/types';

export interface SupportSenderReply {
  id: string;
  body: string;
  createdAt: Date;
  /** The sender wrote it; otherwise staff did, and no staff name is carried. */
  fromSender: boolean;
}

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
  followUpId: string | null;
  /** The sender's standing time-out and its end, null for one with no end date; null with none in force. */
  timedOut: { until: Date | null } | null;
}

export interface SupportSenderRequestProps {
  request: SupportSenderRequestEntry;
  reply?: ReactNode;
  /** The level of the Thread heading: 2 on a page whose only heading above it is its h1. */
  headingLevel?: 2 | 3;
}

export interface SupportSenderReplyBoxProps {
  requestId: string;
  timedOut: { until: Date | null } | null;
}
