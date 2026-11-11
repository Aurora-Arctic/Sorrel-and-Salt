import { oneOf, trimmed } from '../../lib/search-params';
import { isCalendarDay, isoDayInUtc } from '../../lib/utc';
import { BATCH_STATUSES } from './batches';
import type { ArrivalsFilter, CardsFilter } from './types';

// What the two tabs read off their addresses, shared by each tab's page and its action slot. A blank or hand-edited
// value is no filter, never an error; a day that is not `YYYY-MM-DD` is dropped here, as the service refuses it.

const day = (raw: string | string[] | undefined): string => {
  const value = trimmed(raw);
  const parsed = new Date(value);
  return isCalendarDay(value) && !Number.isNaN(parsed.getTime()) && isoDayInUtc(parsed) === value
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

export function readArrivalsFilter(params: { query?: string | string[] }): ArrivalsFilter {
  return { query: trimmed(params.query) };
}
