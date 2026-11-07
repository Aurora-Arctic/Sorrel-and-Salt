import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminCardsCursor, ArrivalsFilter, CardsFilter } from './types';

export const CARDS_PATH: Route = '/keepers/invitation-cards';

export const ARRIVALS_PATH: Route = '/keepers/card-sign-ups';

export const NO_CARDS_FILTER: CardsFilter = {
  batch: '',
  status: '',
  mintedFrom: '',
  mintedTo: '',
  expiresFrom: '',
  expiresTo: '',
};

export const NO_ARRIVALS_FILTER: ArrivalsFilter = { query: '' };

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
  return listHref(ARRIVALS_PATH, { query: filter.query, after, before });
}
