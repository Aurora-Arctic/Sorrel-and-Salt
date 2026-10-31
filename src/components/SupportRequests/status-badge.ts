import type { SupportStatus } from './types';

/** A status's badge: open in the accent's tint, waiting on the sender in the caution tint, the rest muted. Both support screens draw it. */
export const statusBadgeClass = (status: SupportStatus): string => {
  if (status === 'open') return 'badge badge--local';
  if (status === 'waiting_on_sender') return 'badge badge--caution';
  return 'badge badge--muted';
};
