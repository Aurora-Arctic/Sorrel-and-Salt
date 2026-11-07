import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { Forbidden } from './lib/errors';
import { RETURN_PATH_HEADER, signInPath } from './lib/sign-in';
import { assertWorkshopAccess } from '@/modules/identity';

// Route protection's first layer: deny by default, an optimistic cookie check that never touches the
// database, except under /workshop (claude-docs/auth/route-protection.md, "Route protection").

/** An entry is an exact path, or a path ending `/*` for everything beneath it, so `/sign-in` does not admit `/sign-in-help`. */
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/forgot-password',
  '/reset-password',
  '/access-paused', // where a paused account's pages send it; the page reads the session itself
  '/invite/*',
  '/i/*', // a card's short link, accepting like /invite/*
  '/email/*', // public/email/: a mail client fetches its images and fonts with no cookie
  '/compendium', // the one public surface, read by anyone, indexed by search engines
  '/compendium/*',
  '/support', // offers a signed-out visitor Sign In and holds no data
  '/support/request', // a mailed view link: the token in the fragment is the authority, so it needs no session
  '/support/request/*', // the old path form, left public so it answers 404 rather than sending a visitor to sign in
  '/privacy',
  '/privacy/versions/*',
  '/disclaimer',
  '/disclaimer/versions/*',
  '/terms',
  '/terms/versions/*',
  '/code-of-ethics',
  '/code-of-ethics/versions/*',
  // What a crawler or a browser asks for with no cookie and no page to ask it.
  // The icon and manifest files are listed ahead of their existence so the first favicon request
  // is never redirected to sign-in.
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/.well-known/*', // ai-catalog.json and ard.json
  '/favicon.ico',
  '/icon.png',
  '/icon.svg',
  '/apple-icon.png',
  '/manifest.webmanifest',
  '/opengraph-image', // the site share card for `/`; the compendium's cards sit under /compendium/*
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : pathname === route,
  );
}

/**
 * The staging component workshop's static files have no page to call `requireSession()`, so the proxy asks
 * the database itself here (claude-docs/workshop.md, "On staging").
 */
const WORKSHOP = '/workshop';

function isWorkshop(pathname: string): boolean {
  return pathname === WORKSHOP || pathname.startsWith(`${WORKSHOP}/`);
}

/**
 * The workshop's Content Security Policy: its scripts may fetch only files under /workshop/ on the browser's
 * address; not `'none'`, which breaks Storybook, and not `'self'`, which cannot take a path
 * (claude-docs/workshop.md, "The workshop's Content Security Policy").
 */
function workshopPolicy(request: NextRequest): string {
  return `connect-src ${browserHost(request)}${WORKSHOP}/`;
}

// A host with an optional port, nothing that could end the CSP source.
const HOST = /^(?:[a-z0-9.-]+|\[[0-9a-f:.]+\])(?::\d+)?$/i;

/**
 * The host in the browser's address bar for the policy above, not `nextUrl.host`, which is where the server
 * was reached (claude-docs/workshop.md, "The workshop's Content Security Policy").
 */
function browserHost(request: NextRequest): string {
  const named =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? request.headers.get('host');
  return named && HOST.test(named) ? named : request.nextUrl.host;
}

async function refuseWorkshop(request: NextRequest, returnPath: string) {
  // Imported here so every other request keeps a proxy that never loads the
  // database client.
  const { sessionFromHeaders } = await import('./lib/request-session');
  const session = await sessionFromHeaders(request.headers);
  if (!session) return NextResponse.redirect(new URL(signInPath(returnPath), request.url));
  try {
    assertWorkshopAccess(session);
    return null;
  } catch (error) {
    if (error instanceof Forbidden) return new NextResponse(error.message, { status: 403 });
    throw error;
  }
}

async function route(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const returnPath = `${pathname}${search}`;

  if (!isPublic(pathname) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL(signInPath(returnPath), request.url));
  }

  const workshop = isWorkshop(pathname);
  if (workshop) {
    const refusal = await refuseWorkshop(request, returnPath);
    if (refusal) return refusal;
  }

  // Set on every request the proxy passes, so a client-supplied value never
  // survives to the page.
  const headers = new Headers(request.headers);
  headers.set(RETURN_PATH_HEADER, returnPath);
  if (!workshop) return NextResponse.next({ request: { headers } });

  // Storybook links its files relative to the page, so the manager is served from under /workshop/ by
  // redirect, not rewrite (claude-docs/workshop.md, "On staging").
  const response =
    pathname === WORKSHOP
      ? NextResponse.redirect(new URL(`${WORKSHOP}/index.html${search}`, request.url))
      : NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', workshopPolicy(request));
  return response;
}

/**
 * Query parameters that make an address a copy of a real page, kept out of search results; the pager's
 * `after` and `before` are left out (claude-docs/seo/ai-discovery.md, "Keeping copies out of search").
 */
const NOINDEX_PARAMS = ['entry', 'support'];

/**
 * Anything but a production deploy is noindex, keyed on `VERCEL_ENV`, not `NODE_ENV`; on production only an
 * address carrying one of NOINDEX_PARAMS is marked (claude-docs/seo/ai-discovery.md, "Keeping copies out of
 * search").
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = await route(request);
  if (process.env.VERCEL_ENV !== 'production') response.headers.set('X-Robots-Tag', 'noindex');
  else if (NOINDEX_PARAMS.some((name) => request.nextUrl.searchParams.has(name))) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
}

export const config = {
  // Everything except Next's assets, `/api/*` and the Workflow routes is matched, so a file dropped into
  // public/ is a protected page until listed. A named prefix, never an extension pattern; must be a literal
  // (claude-docs/auth/route-protection.md, "The matcher").
  matcher: ['/((?!api/|_next/|\\.well-known/workflow/).*)'],
};
