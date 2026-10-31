import type { SupportStatus } from './types';

/** A status's badge: the open one in the accent's tint, the rest muted. Both support screens draw it. */
export const statusBadgeClass = (status: SupportStatus): string =>
  status === 'open' ? 'badge badge--local' : 'badge badge--muted';
