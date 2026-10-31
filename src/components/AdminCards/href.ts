import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { AdminCardsCursor } from './types';

// The Cards tab's address at a page, with the mint form open or not: `/admin/invitation-cards?after=…&mint`, `mint` a bare flag.

/** The tab itself, at its first page. */
export const CARDS_PATH: Route = '/admin/invitation-cards';

export function cardsHref({ after, before }: AdminCardsCursor = {}, mint = false): Route {
  return listHref(CARDS_PATH, { after, before, mint });
}
