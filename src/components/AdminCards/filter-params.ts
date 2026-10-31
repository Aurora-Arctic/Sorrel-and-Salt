import { oneOf, trimmed } from '../../lib/search-params';
import { BATCH_STATUSES } from './batches';
import type { ArrivalsFilter, CardsFilter } from './types';

// What the two tabs read off their addresses, shared by each tab's page and its action slot. A blank or hand-edited
// value is no filter, never an error; a day that is not `YYYY-MM-DD` is dropped here, as the service refuses it.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (raw: string | string[] | undefined): string => {
  const value = trimmed(raw);
  const parsed = new Date(value);
  return DAY.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : '';
};

export function readCardsFilter(params: {
  batch?: string | string[];
  status?: string | string[];
  mintedFrom?: string | string[];
  mintedTo?: string | string[];
  expiresFrom?: string | string[];
  expiresTo?: string | string[];
}): CardsFilter {
  return {
    batch: trimmed(params.batch),
    status: oneOf(BATCH_STATUSES, trimmed(params.status)) ?? '',
    mintedFrom: day(params.mintedFrom),
    mintedTo: day(params.mintedTo),
    expiresFrom: day(params.expiresFrom),
    expiresTo: day(params.expiresTo),
  };
}

export function readArrivalsFilter(params: {
  query?: string | string[];
  batch?: string | string[];
}): ArrivalsFilter {
  return { query: trimmed(params.query), batch: trimmed(params.batch) };
}
