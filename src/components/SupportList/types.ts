import type { SupportAbout, SupportStatus } from '@/modules/support';
import type { PagePosition } from '../../lib/types';
import type { SupportSenderRequestEntry } from '../SupportSenderRequest/types';

export interface SupportListEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  status: SupportStatus;
  createdAt: Date;
  replyCount: number;
  /** The latest public message is staff's, not the sender's. */
  staffWroteLast: boolean;
}

export interface SupportListProps {
  requests: readonly SupportListEntry[];
  /** How many of all the sender's requests are open and how many closed, not just this page's. */
  counts: { open: number; closed: number };
  opened?: SupportSenderRequestEntry;
  cursor?: { after?: string; before?: string };
  previousHref?: string;
  nextHref?: string;
  position?: PagePosition;
}
