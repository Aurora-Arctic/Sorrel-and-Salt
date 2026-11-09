import type { Route } from 'next';

// Pure, so the server and the browser share one spelling.

export const ACCESS_PAUSED_CODE = 'ACCESS_PAUSED';

export const ACCESS_PAUSED_MESSAGE = 'Access to this account is paused.';

/** The page a paused account's other pages send it to; it reads the pause itself, so the address carries nothing. */
export const ACCESS_PAUSED_PATH = '/access-paused' satisfies Route;

const PAUSED_VIEW_PAGES = ['/support', '/account/support'];

/** Exact paths, since `/` is beneath nothing; read as signed out, they would offer Sign In to a signed-in account. */
const PAUSED_SEND_ON_PAGES = ['/', '/sign-in'];

export function isPausedViewPage(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return (
    PAUSED_SEND_ON_PAGES.includes(pathname) ||
    PAUSED_VIEW_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
  );
}

/** Outside `/coven/[slug]`, whose layout refuses them, and keyed by the slug so the page reads the pause itself rather than trusting the address. */
export function covenPausedPath(slug: string): Route {
  return `/coven-paused/${encodeURIComponent(slug)}` as Route;
}

export function pausedCovenSlugOf(pathname: string): string | undefined {
  const match = /^\/coven-paused\/([^/]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : undefined;
}
