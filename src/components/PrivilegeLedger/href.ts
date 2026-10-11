import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PrivilegeLedgerFilter } from './types';

// The address of `/admin/privilege-changes` under a filter, at a cursor: the
// filter's submit, the pager and each user row's history link build it.

const PATH = '/admin/privilege-changes';

export function privilegeLedgerHref(
  { query, privilege }: PrivilegeLedgerFilter,
  cursor: Readonly<Record<string, string>> = {},
): Route {
  return listHref(PATH, { query, privilege, ...cursor });
}
