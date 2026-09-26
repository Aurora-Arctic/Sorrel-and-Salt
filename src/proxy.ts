import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { Forbidden } from './lib/errors';
import { RETURN_PATH_HEADER, signInPath } from './lib/sign-in';
import { assertWorkshopAccess } from './services/workshop-access';

// Route protection's first layer: deny by default, so a route nobody thought
// about is protected rather than open. The check is optimistic — is a session
// cookie present — and never touches the database; `requireSession()` in the
// page is the check that does — except under /workshop, below. See
// claude-docs/auth.md, "Route protection".

/**
 * The pages a signed-out visitor may reach. An entry is an exact path, or a
 * path ending `/*` for everything beneath it — so `/sign-in` does not admit
 * `/sign-in-help`, and `/invite/*` does not admit `/invites`.
 */
const PUBLIC_ROUTES = [
  '/', // the entry page
  '/sign-in',
  '/invite/*', // accepting an invitation
  '/email/*', // public/email/: a mail client fetches its images and fonts with no cookie
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : pathname === route,
  );
}

/**
 * The staging component workshop: Ladle's static build, written to
 * public/workshop/ by the staging deploy alone. Static files have no page to
 * call `requireSession()`, so this is the one prefix where the proxy asks the
 * database itself. See claude-docs/workshop.md, "On staging".
 */
const WORKSHOP = '/workshop';

function isWorkshop(pathname: string): boolean {
  return pathname === WORKSHOP || pathname.startsWith(`${WORKSHOP}/`);
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

export async function proxy(request: NextRequest): Promise<NextResponse> {
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

  // Ladle is one page routed by query string, and Next serves no directory index.
  const response =
    pathname === WORKSHOP
      ? NextResponse.rewrite(new URL(`${WORKSHOP}/index.html${search}`, request.url), {
          request: { headers },
        })
      : NextResponse.next({ request: { headers } });
  // The workshop's scripts run on this origin with an admin's cookie; they
  // fetch nothing, so nothing — /api/graphql included — is reachable from them.
  response.headers.set('Content-Security-Policy', "connect-src 'none'");
  return response;
}

export const config = {
  // Everything except what is never a page: Next's own assets, and `/api/*`,
  // which answers for itself — Better Auth's handshake, and GraphQL refusing in
  // its own error shape rather than redirecting a fetch. Nothing else is
  // exempt, so a file dropped into public/ is a protected page to this matcher
  // until it gets its own entry here — which is why the backdrop's images are
  // imported by their stylesheet and served under /_next/ instead. A named
  // prefix, never a file-extension pattern: what is public is listed, as in
  // PUBLIC_ROUTES. Must be a literal: Next reads it at build time.
  matcher: ['/((?!api/|_next/).*)'],
};
