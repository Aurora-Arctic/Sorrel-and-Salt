import type { SupportAbout, SupportStatus } from '@/modules/support';
import type { PagePosition } from '../../lib/types';
import type { SupportSenderRequestEntry } from '../SupportSenderRequest/types';

/** One row of the sender's list: its subject, where it stands, what it is about, when it was sent and how many replies it has. */
export interface SupportListEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  status: SupportStatus;
  createdAt: Date;
  /** How many staff replies it has. */
  replyCount: number;
  /** The latest public message is staff's, not the sender's. */
  staffWroteLast: boolean;
}

export interface SupportListProps {
  requests: readonly SupportListEntry[];
  /** How many of all the sender's requests are open and how many closed, not just this page's. */
  counts: { open: number; closed: number };
  /** The request `?request=` opens; none when the address names none. */
  opened?: SupportSenderRequestEntry;
  /** The page's cursor, kept in every address the list builds. */
  cursor?: { after?: string; before?: string };
  previousHref?: string;
  nextHref?: string;
  position?: PagePosition;
}
