import type { ComponentType } from 'react';
import { framed } from '../../components/SkeletonFrame';
import { skeletons } from '../../app/skeletons';
import { ADMIN_PAGES } from '../../components/AdminNav/sections';
import { covenSlugOf } from '../coven-path';
import { matchRoute } from './route-match';

/** Which body draws a page's skeleton: the shell's `main`, a coven's body, an admin area's body or the public help pages' body. */
export type SkeletonHost = 'main' | 'coven' | 'admin' | 'help';

const pathOf = (href: string): string => href.split(/[?#]/)[0] ?? href;

/** The area an admin address is in (`curator` or `keepers`); each area has its own layout and so its own host. */
const adminAreaOf = (pathname: string): string | null => {
  const [, first] = pathname.split('/');
  return first === 'curator' || first === 'keepers' ? first : null;
};

/** A public help page: the help layout's header stands over it. The staff pages have a layout of their own. */
const isPublicHelp = (pathname: string): boolean =>
  (pathname === '/help' || pathname.startsWith('/help/')) &&
  pathname !== '/help/staff' &&
  !pathname.startsWith('/help/staff/');

/** Pages whose content is their query, so a new query on the same page draws the page's skeleton again. */
const QUERY_PAGES: ReadonlySet<string> = new Set(['/help/search']);

/** Whether both addresses are tabs of one admin page, whose tab row stays mounted and swaps its own panel skeleton. */
function sameTabbedPage(pathname: string, destination: string): boolean {
  return Object.values(ADMIN_PAGES).some((page) => {
    const paths = page.tabs.map((tab) => pathOf(tab.href));
    return paths.length > 1 && paths.includes(pathname) && paths.includes(destination);
  });
}

/** Whether the section body of `host` is mounted for `pathname` and stays mounted for the destination. */
function hostStands(host: SkeletonHost, pathname: string, destination: string): boolean {
  if (host === 'coven') {
    // Any coven to any coven: a switch keeps the header and switcher up, busy, over the new coven's page.
    return covenSlugOf(pathname) !== null && covenSlugOf(destination) !== null;
  }
  if (host === 'admin') {
    const here = adminAreaOf(pathname);
    return here !== null && here === adminAreaOf(destination);
  }
  if (host === 'help') return isPublicHelp(pathname) && isPublicHelp(destination);
  return false;
}

/**
 * The skeleton of the page an address opens, if `body` is the one to draw it, else null. A section body
 * draws a page of its own section; the shell's body draws every other registered page, so a page whose
 * section is not standing gets its whole frame. A move within the same page (bar a new query on a page of results), a move between two tabs of one admin
 * page (its tab row stays mounted and swaps its own panel skeleton), and an address no page answers draw nothing here.
 */
export function skeletonFor(
  body: SkeletonHost,
  href: string | undefined,
  pathname: string,
): ComponentType | null {
  if (href === undefined) return null;
  const destination = pathOf(href);
  if (destination === pathname && !QUERY_PAGES.has(pathname)) return null;
  if (sameTabbedPage(pathname, destination)) return null;
  const found = matchRoute(destination);
  if (!found) return null;
  const entry = skeletons[found.pattern as keyof typeof skeletons] as
    { host: SkeletonHost; Skeleton: ComponentType } | undefined;
  if (!entry) return null;
  const standing = entry.host !== 'main' && hostStands(entry.host, pathname, destination);
  if (body === 'main') return standing ? null : framed(entry.host, entry.Skeleton);
  return entry.host === body && standing ? entry.Skeleton : null;
}
