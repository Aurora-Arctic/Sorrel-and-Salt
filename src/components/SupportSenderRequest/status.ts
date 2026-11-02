import type { SupportStatus } from '../SupportRequests/types';

/**
 * What the sender is told about where their request stands, in words: an open request is Received until staff answer it
 * and Replied while staff wrote last; waiting_on_sender is theirs to answer.
 */
export const senderStatusLabel = (status: SupportStatus, staffWroteLast: boolean): string => {
  if (status === 'open') return staffWroteLast ? 'Replied' : 'Received';
  if (status === 'waiting_on_sender') return 'Waiting for You';
  return status === 'resolved' ? 'Resolved' : 'Closed';
};
