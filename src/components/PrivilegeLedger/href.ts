import type { PrivilegeLedgerFilter } from './types';

// The address of `/admin/privilege-changes` under a filter, at a cursor: the
// filter's submit, the pager and each user row's history link build it.

const PATH = '/admin/privilege-changes';

export function privilegeLedgerHref(
  { query, privilege }: PrivilegeLedgerFilter,
  cursor: Record<string, string> = {},
): string {
  const params = new URLSearchParams({
    ...(query && { query }),
    ...(privilege && { privilege }),
    ...cursor,
  }).toString();
  return params ? `${PATH}?${params}` : PATH;
}
