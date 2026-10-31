import type { SupportAbout, SupportStatus } from '@/modules/support';
import type { PagePosition } from '../../lib/types';

export interface SupportReplyEntry {
  id: string;
  body: string;
  createdAt: Date;
}

/** One request of the signed-in sender, with the replies staff have written to it. */
export interface SupportListEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  message: string;
  status: SupportStatus;
  createdAt: Date;
  /** The tracker issue a bug was filed as, once it has one. */
  issueUrl: string | null;
  /** Oldest first. */
  replies: readonly SupportReplyEntry[];
}

export interface SupportListProps {
  requests: readonly SupportListEntry[];
  previousHref?: string;
  nextHref?: string;
  position?: PagePosition;
}
