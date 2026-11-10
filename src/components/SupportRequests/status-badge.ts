import type { SupportStatus } from './types';

export const statusBadgeClass = (status: SupportStatus): string => {
  if (status === 'open') return 'badge badge--local';
  if (status === 'waiting_on_sender') return 'badge badge--caution';
  return 'badge badge--muted';
};
