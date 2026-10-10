import type { UserListFilterValue } from './types';

// The address of `/admin/users` under a filter, at a cursor: the page's pager
// and the filter's submit both build it. `awaiting` is a bare flag, read by
// its presence (MB.53, on the owner's word); `URLSearchParams` would write it
// `awaiting=`, so the pairs are joined here.

const PATH = '/admin/users';

export function userListHref(
  { query, awaitingApproval, role }: UserListFilterValue,
  cursor: Record<string, string> = {},
): string {
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(query ? [pair('query', query)] : []),
    ...(awaitingApproval ? ['awaiting'] : []),
    ...(role ? [pair('role', role)] : []),
    ...Object.entries(cursor).map(([name, value]) => pair(name, value)),
  ];
  return parts.length ? `${PATH}?${parts.join('&')}` : PATH;
}
