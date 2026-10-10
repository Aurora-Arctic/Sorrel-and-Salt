import type { PrivilegeLedgerFilter } from './types';

// The address of `/admin/privilege-changes` under a filter, at a cursor: the
// privilege links, the pager and each user row's History link build it.

const PATH = '/admin/privilege-changes';

export function privilegeLedgerHref(
  { userId, privilege }: PrivilegeLedgerFilter,
  cursor: Record<string, string> = {},
): string {
  const params = new URLSearchParams({
    ...(userId && { user: userId }),
    ...(privilege && { privilege }),
    ...cursor,
  }).toString();
  return params ? `${PATH}?${params}` : PATH;
}
