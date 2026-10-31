import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { Forbidden } from './lib/errors';
import { RETURN_PATH_HEADER, signInPath } from './lib/sign-in';
import { assertWorkshopAccess } from '@/modules/identity';

// Route protection's first layer: deny by default, so a route nobody thought
// about is protected rather than open. The check is optimistic — is a session
// cookie present — and never touches the database; `requireSession()` in the
// page is the check that does — except under /workshop, below. See
// claude-docs/auth/route-protection.md, "Route protection".

/**
 * The pages a signed-out visitor may reach. An entry is an exact path, or a
 * path ending `/*` for everything beneath it — so `/sign-in` does not admit
 * `/sign-in-help`, and `/invite/*` does not admit `/invites`.
 */
const PUBLIC_ROUTES = [
  '/', // the entry page
  '/sign-in',
  '/forgot-password', // asking for a password reset link
  '/reset-password', // where the mailed reset link lands
  '/invite/*', // accepting an invitation
  '/i/*', // a card's short link, accepting like /invite/*
  '/email/*', // public/email/: a mail client fetches its images and fonts with no cookie
  '/compendium', // the one public surface, read by anyone, indexed by search engines
  '/compendium/*',
  '/support', // offers a signed-out visitor Sign In and holds no data
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
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : pathname === route,
  );
}

/**
 * The staging component workshop: Storybook's static build, written to
 * public/workshop/ by the staging deploy alone. Static files have no page to
 * call `requireSession()`, so this is the one prefix where the proxy asks the
 * database itself. See claude-docs/workshop.md, "On staging".
 */
const WORKSHOP = '/workshop';

function isWorkshop(pathname: string): boolean {
  return pathname === WORKSHOP || pathname.startsWith(`${WORKSHOP}/`);
}

/**
 * The workshop's Content Security Policy: its scripts may fetch, by `fetch`,
 * XHR or WebSocket, only files under /workshop/ on the address the browser
 * used. Storybook reads its own `index.json` and `project.json` that way, so
 * `'none'` would break it. A source with a path ending `/` matches that prefix
 * alone, so /api/graphql and every other path stay refused, though the
 * scripts carry an admin's cookie. Not `'self'`, which cannot take a path.
 * Nothing else is restricted: the manager frames its own `iframe.html`, and
 * no header here or in next.config.ts forbids framing.
 */
function workshopPolicy(request: NextRequest): string {
  return `connect-src ${browserHost(request)}${WORKSHOP}/`;
}

/** A host, with an optional port: nothing that could end the CSP source. */
const HOST = /^(?:[a-z0-9.-]+|\[[0-9a-f:.]+\])(?::\d+)?$/i;

/**
 * The host in the browser's address bar, for the policy above. Not
 * `nextUrl.host`, which is the address the server was reached on: `next
 * start` bound to 0.0.0.0, or a container port behind a mapping, and the
 * policy then refuses Storybook's own files. A forwarding host names the
 * public one in `x-forwarded-host`, as Next's own Server Actions check reads
 * it. No scheme, so the source takes the page's, http or https, wherever TLS
 * ends. A value that is not a plain host falls back to `nextUrl.host`.
 */
function browserHost(request: NextRequest): string {
  const named =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? request.headers.get('host');
  return named && HOST.test(named) ? named : request.nextUrl.host;
}

/** A refusal for this workshop request, or `null` to let it through. */
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

  // Storybook links its files relative to the page, so the manager must be
  // served from under /workshop/: at bare /workshop, ./iframe.html would be
  // /iframe.html. Not a rewrite, which keeps the browser's URL, and not
  // /workshop/, which Next's trailing-slash redirect sends back here.
  const response =
    pathname === WORKSHOP
      ? NextResponse.redirect(new URL(`${WORKSHOP}/index.html${search}`, request.url))
      : NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', workshopPolicy(request));
  return response;
}

/**
 * Anything but a production deploy tells search engines to index nothing,
 * because staging is a public URL that would otherwise be indexed as a
 * duplicate of the compendium . `VERCEL_ENV`, not `NODE_ENV`, which is
 * `production` on every deploy, staging included (the test impersonation
 * uses, src/lib/impersonation.ts). Unset locally, so a dev server is noindex too.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = await route(request);
  if (process.env.VERCEL_ENV !== 'production') response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export const config = {
  // Everything except what is never a page: Next's own assets, and `/api/*`,
  // which answers for itself — Better Auth's handshake, and GraphQL refusing in
  // its own error shape rather than redirecting a fetch, and the Workflow SDK's generated
  // `/.well-known/workflow/` routes, which take its queue calls and fail if this runs first. Nothing else is
  // exempt, so a file dropped into public/ is a protected page to this matcher
  // until it gets its own entry here — which is why the backdrop's images are
  // imported by their stylesheet and served under /_next/ instead. A named
  // prefix, never a file-extension pattern: what is public is listed, as in
  // PUBLIC_ROUTES. Must be a literal: Next reads it at build time.
  matcher: ['/((?!api/|_next/|\\.well-known/workflow/).*)'],
};
