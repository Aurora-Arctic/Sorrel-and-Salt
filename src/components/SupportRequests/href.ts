import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { SupportRequestsCursor, SupportRequestsFilter } from './types';

// The page's address under its filter and page, with a request open or not:
// `/admin/support?about=bug&status=open&error=500&after=…&request=<id>`.

/** The page itself, unfiltered: where the filter submits. */
export const SUPPORT_PATH: Route = '/admin/support';

export function supportHref(
  { about, status, errorCode }: Partial<SupportRequestsFilter> = {},
  { after, before }: SupportRequestsCursor = {},
  request?: string,
): Route {
  return listHref(SUPPORT_PATH, { about, status, error: errorCode, after, before, request });
}
