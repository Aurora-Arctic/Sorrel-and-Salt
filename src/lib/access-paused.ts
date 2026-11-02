import type { Route } from 'next';

// The access pauses as the request sees them: the code a paused call answers with, the pages a site pause leaves open, and the
// paused pages' addresses. Pure, so the server and the browser share one spelling.

/** The code a call refused for a standing pause answers with, beside the pause's end as `pausedUntil`. */
export const ACCESS_PAUSED_CODE = 'ACCESS_PAUSED';

/** The refusal's sentence, for a client that reads the message rather than the code. */
export const ACCESS_PAUSED_MESSAGE = 'Access to this account is paused.';

/** The page a paused account's other pages send it to; it reads the pause itself, so the address carries nothing. */
export const ACCESS_PAUSED_PATH = '/access-paused' satisfies Route;

/** The pages a paused account reaches signed in, with everything beneath them: support, where it may ask about the pause. */
const PAUSED_VIEW_PAGES = ['/support', '/account/support'];

/**
 * The pages that read a paused account as signed in only to send it on, to `?next=` or its landing: the entry page and the
 * sign-in page. Exact paths, since `/` is beneath nothing; read as signed out, they would offer Sign In to a signed-in account.
 */
const PAUSED_SEND_ON_PAGES = ['/', '/sign-in'];

/** Whether a page's path, its query ignored, is one a paused account reaches signed in rather than being sent to the paused page. */
export function isPausedViewPage(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return (
    PAUSED_SEND_ON_PAGES.includes(pathname) ||
    PAUSED_VIEW_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
  );
}

/**
 * Where a member whose access to one coven is paused is sent from that coven's pages. Outside `/coven/[slug]`, whose layout
 * refuses them, and keyed by the slug so the page reads the pause itself rather than trusting the address.
 */
export function covenPausedPath(slug: string): Route {
  return `/coven-paused/${encodeURIComponent(slug)}` as Route;
}

/** The coven slug a page's path sits under, `/coven/<slug>/…`, or `undefined` for a page outside every coven. */
export function covenSlugOf(pathname: string): string | undefined {
  const match = /^\/coven\/([^/]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : undefined;
}
