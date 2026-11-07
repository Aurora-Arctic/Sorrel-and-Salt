import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { PagerCursor } from '../../lib/types';
import type { PrivilegeLedgerFilter } from './types';

export const PRIVILEGE_CHANGES_PATH: Route = '/keepers/privilege-changes';

export function privilegeLedgerHref(
  { query, privilege }: PrivilegeLedgerFilter,
  cursor?: PagerCursor,
): Route {
  return listHref(PRIVILEGE_CHANGES_PATH, { query, privilege, ...cursor });
}
