import type { BatchStatus } from './types';

/** A batch's short name: the first block of its id, enough to tell two apart on a page. */
export const batchName = (batchId: string): string => batchId.slice(0, 8);

/**
 * Where a batch stands, from its counts: a card still pending makes it live. With none pending, every card accepted is
 * used up, a passed expiry is expired, and what is left was revoked. The counts, not a card's `revokedAt`, because the
 * head card of a batch may be one that was accepted before the revoke.
 */
export const batchStatus = (
  totals: { cards: number; accepted: number; pending: number },
  expiresAt: Date,
  now: Date,
): BatchStatus => {
  if (totals.pending > 0) return 'live';
  if (totals.cards > 0 && totals.accepted === totals.cards) return 'used-up';
  return expiresAt <= now ? 'expired' : 'revoked';
};

/** The words a status is shown as. */
export const STATUS_LABEL: Record<BatchStatus, string> = {
  live: 'Live',
  revoked: 'Revoked',
  expired: 'Expired',
  'used-up': 'Used up',
};
