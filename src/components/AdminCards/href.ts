import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminCardsCursor, ArrivalsFilter, CardsFilter } from './types';

// The Cards tab's address under its filter and page, with the mint form open or not:
// `/admin/invitation-cards?batch=ab&status=live&after=…&mint`, `mint` a bare flag. The Sign-Ups tab's is
// `/admin/card-sign-ups?query=fern&batch=ab&after=…`. The pager and form keep the filter; the filter's submit names no cursor.

/** The tab itself, at its first page. */
export const CARDS_PATH: Route = '/admin/invitation-cards';

/** The Sign-Ups tab itself, at its first page. */
export const ARRIVALS_PATH: Route = '/admin/card-sign-ups';

export const NO_CARDS_FILTER: CardsFilter = {
  batch: '',
  status: '',
  mintedFrom: '',
  mintedTo: '',
  expiresFrom: '',
  expiresTo: '',
};

export const NO_ARRIVALS_FILTER: ArrivalsFilter = { query: '', batch: '' };

export function cardsHref(
  { after, before }: AdminCardsCursor = {},
  mint = false,
  filter: Partial<CardsFilter> = {},
): Route {
  const { batch, status, mintedFrom, mintedTo, expiresFrom, expiresTo } = filter;
  return listHref(CARDS_PATH, {
    batch,
    status,
    mintedFrom,
    mintedTo,
    expiresFrom,
    expiresTo,
    after,
    before,
    mint,
  });
}

export function arrivalsHref(
  filter: Partial<ArrivalsFilter> = {},
  { after, before }: AdminCardsCursor = {},
): Route {
  return listHref(ARRIVALS_PATH, { query: filter.query, batch: filter.batch, after, before });
}
