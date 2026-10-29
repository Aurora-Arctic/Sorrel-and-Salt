// Whether an address is at a link's page: the page itself or any address
// beneath it, but not one whose path merely begins with its letters, so a
// later `/admin/forms-archive` does not count as at `/admin/forms`. Hence the
// slash, rather than a bare `startsWith(href)`. The admin nav and the page
// tabs each mark the link you are at by it.
export const isAtPath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
