import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PageTab } from '../TabbedPage/types';
import { DEFAULT_SUPPORT_VIEW, SUPPORT_VIEWS, type SupportView } from '../../lib/support-path';
import type { SupportRequestsCursor, SupportRequestsFilter } from './types';

// The page's address under its filter and page, with a request and a user open or not:
// `/admin/support?view=mine&about=bug&error=500&after=…&request=<id>&user=<id>`.

/** The name of the page's second modal place, the user's, so a press on a sender's name shows there and not in the request's. */
export const USER_MODAL_PLACE = 'user';

/** The page itself, unfiltered: where the filter submits. */
export const SUPPORT_PATH: Route = '/admin/support';

/** The `beta` parameter's value that narrows the page to beta testers. */
export const BETA_ONLY = 'only';

export function supportHref(
  { about, view, errorCode, betaOnly }: Partial<SupportRequestsFilter> = {},
  { after, before }: SupportRequestsCursor = {},
  request?: string,
  user?: string,
): Route {
  return listHref(SUPPORT_PATH, {
    about,
    view: view === DEFAULT_SUPPORT_VIEW ? undefined : view,
    error: errorCode,
    beta: betaOnly ? BETA_ONLY : undefined,
    after,
    before,
    request,
    user,
  });
}

/** The six views as the page's tab row: each its own address under the filter's other choices, with its count when known. */
export function supportViewTabs(
  filter: SupportRequestsFilter,
  counts?: Record<SupportView, number>,
): PageTab[] {
  return SUPPORT_VIEWS.map(({ value, label }) => ({
    href: supportHref({ ...filter, view: value }),
    label,
    count: counts?.[value],
    filtered: true,
    shape: 'requests',
  }));
}
