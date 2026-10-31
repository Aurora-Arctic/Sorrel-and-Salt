import type { SupportAbout, SupportStatus } from '@/modules/support';
import type { PagePosition } from '../../lib/types';
import type { SupportSenderRequestEntry } from '../SupportSenderRequest/types';

/** One row of the sender's list: what the request is about and which page, when it was sent and where it stands. */
export interface SupportListEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  /** The page it was about; none when the sender gave none. */
  path: string | null;
  status: SupportStatus;
  createdAt: Date;
}

export interface SupportListProps {
  requests: readonly SupportListEntry[];
  /** The request `?request=` opens; none when the address names none. */
  opened?: SupportSenderRequestEntry;
  /** The page's cursor, kept in every address the list builds. */
  cursor?: { after?: string; before?: string };
  previousHref?: string;
  nextHref?: string;
  position?: PagePosition;
}
