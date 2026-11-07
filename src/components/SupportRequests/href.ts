import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PageTab } from '../TabbedPage/types';
import { DEFAULT_SUPPORT_VIEW, SUPPORT_VIEWS, type SupportView } from '../../lib/support-path';
import type { SupportRequestsCursor, SupportRequestsFilter } from './types';

// The page's address under its filter and page, with a request and a user open or not:
// `/keepers/support?view=mine&about=bug&error=500&sender=beta_tester&after=…&request=<id>&user=<id>`.

/** The name of the page's second modal place, the user's, so a press on a sender's name shows there and not in the request's. */
export const USER_MODAL_PLACE = 'user';

export const SUPPORT_PATH: Route = '/keepers/support';

export function supportHref(
  { about, view, errorCode, sender }: Partial<SupportRequestsFilter> = {},
  { after, before }: SupportRequestsCursor = {},
  request?: string,
  user?: string,
): Route {
  return listHref(SUPPORT_PATH, {
    about,
    view: view === DEFAULT_SUPPORT_VIEW ? undefined : view,
    error: errorCode,
    sender: sender || undefined,
    after,
    before,
    request,
    user,
  });
}

export const SUPPORT_COLUMNS = 9;
export const SUPPORT_FIELDS = 3;

export function supportViewTabs(
  filter: SupportRequestsFilter,
  counts?: Record<SupportView, number>,
): PageTab[] {
  return SUPPORT_VIEWS.map(({ value, label }) => ({
    href: supportHref({ ...filter, view: value }),
    label,
    count: counts?.[value],
    filtered: true,
    shape: 'table',
    columns: SUPPORT_COLUMNS,
    fields: SUPPORT_FIELDS,
  }));
}
