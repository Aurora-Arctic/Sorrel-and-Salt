import type { ComponentType } from 'react';
import { skeletons } from '../../app/skeletons';
import { covenSlugOf } from '../coven-path';
import { matchRoute } from './route-match';

/** Which body draws a page's skeleton: the shell's `main`, a coven's body or an admin area's body. */
export type SkeletonHost = 'main' | 'coven' | 'admin';

const pathOf = (href: string): string => href.split(/[?#]/)[0] ?? href;

/** The area an admin address is in (`curator` or `keepers`); each area has its own layout and so its own host. */
const adminAreaOf = (pathname: string): string | null => {
  const [, first] = pathname.split('/');
  return first === 'curator' || first === 'keepers' ? first : null;
};

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
  return false;
}

/**
 * The skeleton of the page an address opens, if `body` is the one to draw it, else null. A section body
 * draws a page of its own section; the shell's body draws every other registered page, so a page whose
 * section is not standing gets its whole frame. A move within the same page, and an address no page
 * answers, draw nothing here.
 */
export function skeletonFor(
  body: SkeletonHost,
  href: string | undefined,
  pathname: string,
): ComponentType | null {
  if (href === undefined) return null;
  const destination = pathOf(href);
  if (destination === pathname) return null;
  const found = matchRoute(destination);
  if (!found) return null;
  const entry = skeletons[found.pattern as keyof typeof skeletons] as
    { host: SkeletonHost; Skeleton: ComponentType } | undefined;
  if (!entry) return null;
  const standing = entry.host !== 'main' && hostStands(entry.host, pathname, destination);
  if (body === 'main') return standing ? null : entry.Skeleton;
  return entry.host === body && standing ? entry.Skeleton : null;
}
