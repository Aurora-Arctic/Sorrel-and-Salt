// Where the provisional account a signed-out support send mints acts as signed in: the two support pages, and everything
// beneath them. Everywhere else it reads as signed out, so no page, API call or the proxy takes it for a person.

const ANONYMOUS_VIEW_PAGES = ['/support', '/account/support'];

/** Whether a page's path, its query ignored, is one an anonymous session reaches signed in. */
export function isAnonymousViewPage(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return ANONYMOUS_VIEW_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
