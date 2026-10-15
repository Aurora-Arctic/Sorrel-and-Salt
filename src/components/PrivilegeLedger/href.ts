import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PagerCursor } from '../../lib/types';
import type { PrivilegeLedgerFilter } from './types';

// The address of `/admin/privilege-changes` under a filter, at a cursor: the
// filter's submit, the pager and each user row's history link build it.

/** The page itself, unfiltered: where the filter submits. */
export const PRIVILEGE_CHANGES_PATH: Route = '/admin/privilege-changes';

export function privilegeLedgerHref(
  { query, privilege }: PrivilegeLedgerFilter,
  cursor?: PagerCursor,
): Route {
  return listHref(PRIVILEGE_CHANGES_PATH, { query, privilege, ...cursor });
}
