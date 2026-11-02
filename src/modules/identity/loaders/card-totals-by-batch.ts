import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import type { CardBatchTotal } from '../../../db/repository';
import { cardBatchTotals as totalsOf } from '../services/invitation-cards';

const EMPTY = { cards: 0, accepted: 0, pending: 0, attempts: 0 };

/** A batch's cards, accepted cards, pending cards and refused opens, batched across a page of batches. An admin's; any other viewer's load is refused. */
export const cardTotalsByBatch = defineSignedInLoader<string, Omit<CardBatchTotal, 'batchId'>>(
  async (session, ids) => {
    const totals = new Map((await totalsOf(session, ids)).map((t) => [t.batchId, t]));
    return ids.map((id) => totals.get(id) ?? EMPTY);
  },
);
