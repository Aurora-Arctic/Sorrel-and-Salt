import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminCardsCursor, CardsFilter } from './types';

// The Cards tab's address under its filter and page, with the mint form open or not:
// `/admin/invitation-cards?batch=ab&status=live&after=…&mint`, `mint` a bare flag. The pager and form keep the filter; the filter's submit names no cursor.

/** The tab itself, at its first page. */
export const CARDS_PATH: Route = '/admin/invitation-cards';

export const NO_CARDS_FILTER: CardsFilter = {
  batch: '',
  status: '',
  mintedFrom: '',
  mintedTo: '',
  expiresFrom: '',
  expiresTo: '',
};

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
