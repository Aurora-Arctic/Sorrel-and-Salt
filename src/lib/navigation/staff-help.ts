/** A public help page: the help layout's header stands over it. The staff pages have a layout of their own. */
export const isPublicHelp = (pathname: string): boolean =>
  (pathname === '/help' || pathname.startsWith('/help/')) &&
  pathname !== '/help/staff' &&
  !pathname.startsWith('/help/staff/');

/**
 * Whether a move from a staff help page opens a public one, which draws the public help header afresh over the old
 * page: the old page's search box is held under it and the header's own box stands in its place, both shut.
 */
export const leavesStaffHelp = (pathname: string, href: string): boolean =>
  (pathname === '/help/staff' || pathname.startsWith('/help/staff/')) &&
  isPublicHelp(href.split(/[?#]/)[0] ?? href);

/**
 * The help index a page belongs to, where a blank search goes: `/help/staff` for a staff page, `/help` for a public
 * one. It is the page itself on an index, so the caller moves only when this is not where it already is.
 */
export const helpHomeOf = (pathname: string): string =>
  pathname === '/help/staff' || pathname.startsWith('/help/staff/') ? '/help/staff' : '/help';
