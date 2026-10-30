import type { BatchSummary, CardEntry } from './types';

/** The batches a page of cards touches, in the order they first appear, each with how many cards it shows and how many are pending. */
export function summariseBatches(cards: readonly CardEntry[]): BatchSummary[] {
  const batches = new Map<string, BatchSummary>();
  for (const card of cards) {
    const batch = batches.get(card.batchId) ?? { batchId: card.batchId, cards: 0, pending: 0 };
    batch.cards += 1;
    if (card.state === 'pending') batch.pending += 1;
    batches.set(card.batchId, batch);
  }
  return [...batches.values()];
}

/** A batch's short name: the first block of its id, enough to tell two apart on a page. */
export const batchName = (batchId: string): string => batchId.slice(0, 8);
