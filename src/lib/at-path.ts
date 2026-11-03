// Whether an address is at a link's page: the page or any address beneath it, but not one merely beginning with its letters (`/curator/forms-archive`
// is not at `/curator/forms`), hence the slash. The admin nav and page tabs mark the link you are at by it.
export const isAtPath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
