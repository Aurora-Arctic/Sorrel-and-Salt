import type { SupportStatus } from '../SupportRequests/types';

/** An open request is Received until staff answer it and Replied while staff wrote last. */
export const senderStatusLabel = (status: SupportStatus, staffWroteLast: boolean): string => {
  if (status === 'open') return staffWroteLast ? 'Replied' : 'Received';
  if (status === 'waiting_on_sender') return 'Waiting for You';
  return status === 'resolved' ? 'Resolved' : 'Closed';
};
